const Alexa = require('ask-sdk');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter'); // included in ask-sdk

const ddbTableName = 'High-Low-Test';
const SKILL_NAME = 'High Low Game';
const FALLBACK_MESSAGE_DURING_GAME = `The ${SKILL_NAME} skill can't help you with that.  Try guessing a number between 0 and 100. `;
const FALLBACK_REPROMPT_DURING_GAME = 'Please guess a number between 0 and 100.';
const FALLBACK_MESSAGE_OUTSIDE_GAME = `The ${SKILL_NAME} skill can't help you with that.  It will come up with a number between 0 and 100 and you try to guess it by saying a number in that range. Would you like to play?`;
const FALLBACK_REPROMPT_OUTSIDE_GAME = 'Say yes to start the game or no to quit.';



const LaunchRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;

    const attributes = await attributesManager.getPersistentAttributes() || {};

    if (Object.keys(attributes).length === 0) {
      attributes.endedSessionCount = 0;
      attributes.gamesPlayed = 0;
      attributes.gameState = 'ENDED';
    }

    attributesManager.setSessionAttributes(attributes);

    const gamesPlayed = attributes.gamesPlayed.toString()
    const speechText = `Welcome to High Low custom code. You have played ${gamesPlayed} time. Would you like to play?`
    const repromptText = 'You can say yes or no';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};


const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Thanks for playing!')
      .getResponse();
  },
};


const SessionEndedRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session Ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};


const HelpIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechOutput = 'I am thinking of a number between zero and one hundred, try to guess it and i will say if it is higher or lower'
    const repromptOutput = 'Try saying a number.';

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const YesIntent = {
  canHandle(handlerInput) {

    let isCurrentlyPlaying = false;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (sessionAttributes && sessionAttributes.gameState === 'STARTED') {
        isCurrentlyPlaying = true
    }
    return !isCurrentlyPlaying && handlerInput.requestEnvelope.request.type === 'IntentRequest' && 
    handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
  },
  handle(handlerInput) {
    //get reference to sessions:
      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();

      sessionAttributes.gameState = 'STARTED';
      sessionAttributes.guessNumber = Math.floor(Math.random() * 101)

      return handlerInput.responseBuilder
      .speak(`Great! Try saying a number between 0 and 100 to start the game`)
      .reprompt(`Try saying a number`)
      .getResponse();
    },
  }

  const NoIntent = {
    canHandle(handlerInput) {
      // only treat no as an exit when outside a game
      let isCurrentlyPlaying = false;
      const { attributesManager } = handlerInput;
      const sessionAttributes = attributesManager.getSessionAttributes();
  
      if (sessionAttributes.gameState &&
        sessionAttributes.gameState === 'STARTED') {
        isCurrentlyPlaying = true;
      }
  
      return !isCurrentlyPlaying 
        && Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' 
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent';
    },
    async handle(handlerInput) {
      const { attributesManager } = handlerInput;
      const requestAttributes = attributesManager.getRequestAttributes();
      const sessionAttributes = attributesManager.getSessionAttributes();
  
      sessionAttributes.endedSessionCount += 1;
      sessionAttributes.gameState = 'ENDED';
      attributesManager.setPersistentAttributes(sessionAttributes);
  
      await attributesManager.savePersistentAttributes();
  
      return handlerInput.responseBuilder
        .speak('Ok Goodbye')
        .getResponse();
  
    },
  };

  const UnhandledIntent = {
    canHandle() {
      return true;
    },
    handle(handlerInput) {
      const outputSpeech = 'Say yes to continue, or no to end the game.';
  
      return handlerInput.responseBuilder
        .speak(outputSpeech)
        .reprompt(outputSpeech)
        .getResponse();
    },
  };
  

  const NumberGuessIntent = {
    canHandle(handlerInput) {
      let isCurrentlyPlaying = false;
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  
      if (sessionAttributes && sessionAttributes.gameState === 'STARTED') {
          isCurrentlyPlaying = true
      }
      // handle numbers only during a game
      
      const request = handlerInput.requestEnvelope.request;
  
      return isCurrentlyPlaying && request.type === 'IntentRequest' && request.intent.name === 'NumberGuessIntent';
    },
    async handle(handlerInput) {
      const { requestEnvelope, attributesManager } = handlerInput;
      
      const sessionAttributes = attributesManager.getSessionAttributes();
  
      const guessNum = parseInt(requestEnvelope.request.intent.slots.number.value, 10);
      //parseInt(requestEnvelope.request.intent.slots.number.value, 10);
      const targetNum = sessionAttributes.guessNumber;
      
      if (guessNum > targetNum) {
        return handlerInput.responseBuilder
          .speak(`${guessNum.toString()} is too high`)
          .reprompt('Try saying a smaller number')
          .getResponse();
      } else if (guessNum < targetNum) {
        return handlerInput.responseBuilder
          .speak(`${guessNum.toString()} is too low`)
          .reprompt('Try saying a larger number')
          .getResponse();
      } else if (guessNum === targetNum) {
        sessionAttributes.gamesPlayed += 1;
        sessionAttributes.gameState = 'ENDED';
        attributesManager.setPersistentAttributes(sessionAttributes);
        await attributesManager.savePersistentAttributes();
        
        return handlerInput.responseBuilder
          .speak(`${guessNum.toString()} is correct. Would you like to play a new game?`)
          .reprompt('Say yes to start a new game, or no to end the game.')
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak('Sorry, I didn\'t get that. Try saying a number')
        .reprompt('Try saying a number')
        .getResponse();
    },
  };



  const FallbackHandler = {
    canHandle(handlerInput) {
      // handle fallback intent, yes and no when playing a game
      // for yes and no, will only get here if and not caught by the normal intent handler
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent' 
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
      const { attributesManager } = handlerInput;
      //const attributesManager = handlerInput.attributesManager;
      
      const requestAttributes = attributesManager.getRequestAttributes();
      const sessionAttributes = attributesManager.getSessionAttributes();
  
      if (sessionAttributes.gameState && sessionAttributes.gameState === 'STARTED') {
        // currently playing
        return handlerInput.responseBuilder
          .speak(FALLBACK_MESSAGE_DURING_GAME)
          .reprompt(FALLBACK_REPROMPT_DURING_GAME)
          .getResponse();
      }
  
      // not playing
      return handlerInput.responseBuilder
        .speak(FALLBACK_MESSAGE_OUTSIDE_GAME)
        .reprompt(FALLBACK_REPROMPT_OUTSIDE_GAME)
        .getResponse();
    },
  };

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    
   

    return handlerInput.responseBuilder
      .speak(`Sorry, I can\'t understand the command. Please say again`)
      .reprompt(`Sorry, I can\'t understand the command. Please say again.`)
      .getResponse();
  },
};

function getPersistenceAdapter(tableName) {
  // Determines persistence adapter to be used based on environment
  // Note: tableName is only used for DynamoDB Persistence Adapter
  if (process.env.S3_PERSISTENCE_BUCKET) {
    // in Alexa Hosted Environment
    // eslint-disable-next-line global-require
    const s3Adapter = require('ask-sdk-s3-persistence-adapter');
    return new s3Adapter.S3PersistenceAdapter({
      bucketName: process.env.S3_PERSISTENCE_BUCKET,
    });
  }


  // Not in Alexa Hosted Environment
  return new ddbAdapter.DynamoDbPersistenceAdapter({
    tableName: tableName,
    createTable: true,
  });
}


const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .withPersistenceAdapter(getPersistenceAdapter(ddbTableName))
  .addRequestHandlers(
    LaunchRequest,
    ExitHandler,
    SessionEndedRequest,
    HelpIntent,
    YesIntent,
    NoIntent,
    NumberGuessIntent,
    FallbackHandler,
    UnhandledIntent,
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();