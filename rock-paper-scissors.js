Games = new Mongo.Collection("games");

if (Meteor.isClient) {

	Session.setDefault('playerID', 0);

	Meteor.startup(function(){
		//Determine which player the user is.
		var path = window.location.pathname;
		var regexp = /\/player(\d+)\/?/i;
		if(regexp.test(path)){
			var matches = path.match(regexp);
			var n = parseInt(matches[1], 10);
			if(n == 1 || n == 2){
				Session.set('playerID', n);
			}
		}

		//Initialize the game
		Meteor.call("initGame", function(error, result){
			if(error){
				//TODO: make a better user notification for the error
				alert("An error occurred during game initialization");
				console.error(error);
			}
			else{
				Session.set('gameID', result);
			}
		});
	});

	Template.body.helpers({
		validPlayer : function(){
			return Session.get('playerID') !== 0;
		}
	});

	/**
	* Helper function to determine the outcome of the game
	*/
	var resultClassHelper = function(a, b){
		if(a == b){
			return 'tie';
		}

		if( (a == "rock" && b == "scissors")
			|| (a == "scissors" && b == "paper")
			|| (a == "paper" && b == "rock") ){
			return "winner";
		}

		return "loser";
	}

	Template.game.helpers({
		playerName : function(){
			return "Player " + Session.get('playerID');
		},
		otherPlayerName : function(){
			return "Player " + (3-Session.get('playerID'));
		},
		/**
		* Returns a boolean indicating whether this player has already
		* chosen their play.
		*/
		madeSelection : function(){
			var g = Games.findOne(Session.get('gameID'));
			if(Session.get('playerID') == 1){
				return g.p1Play !== null;
			}
			else{
				return g.p2Play !== null;
			}
		},
		/**
		* Retrieves this player's selection
		*/
		playerSelection : function(){
			var g = Games.findOne(Session.get('gameID'));
			if(Session.get('playerID') == 1){
				return g.p1Play;
			}
			else{
				return g.p2Play;
			}
		},
		/**
		* Retrieves the other player's selection
		*/
		otherPlayerSelection : function(){
			var g = Games.findOne(Session.get('gameID'));
			if(Session.get('playerID') == 1){
				return g.p2Play;
			}
			else{
				return g.p1Play;
			}
		},
		/**
		* Returns a boolean indicating that the game is over, ie. that both
		* players made selections
		*/
		gameOver : function(){
			var game = Games.findOne(Session.get("gameID"));
			return game.p1Play != null && game.p2Play != null;
		},
		/**
		* Returns this player's standing in the game (ie. 'tie', 'winner', 'loser')
		*/
		playerResult : function(){
			var game = Games.findOne(Session.get("gameID"));
			if(Session.get('playerID') == 1){
				return resultClassHelper(game.p1Play, game.p2Play);
			}
			else{
				return resultClassHelper(game.p2Play, game.p1Play);
			}			
		},
		/**
		* Returns the other player's standing in the game (ie. 'tie', 'winner', 'loser')
		*/
		otherPlayerResult : function(){
			var game = Games.findOne(Session.get("gameID"));
			if(Session.get('playerID') == 1){
				return resultClassHelper(game.p2Play, game.p1Play);
			}
			else{
				return resultClassHelper(game.p1Play, game.p2Play);
			}
		},
		/**
		* Generates a string to use as the title on the result view.
		*/
		resultTitle : function(){
			var game = Games.findOne(Session.get("gameID"));
			var result;
			if(Session.get('playerID') == 1){
				result = resultClassHelper(game.p1Play, game.p2Play);
			}
			else{
				result = resultClassHelper(game.p2Play, game.p1Play);
			}
			if(result == "tie"){
				return "Tie Game";
			}
			else if(result == "winner"){
				return "You Won!";
			}
			else{
				return "You Lost";
			}
		}
	});

	Template.game.events({
		/**
		* Event handler for when the player selects their play
		*/
		"click button.selection-button" : function(event){
			var $b = $(event.currentTarget);
			var play = $b.attr("data-value");
			Meteor.call("setPlay", Session.get('gameID'), Session.get('playerID'), play);
		},
		/**
		* Event handler for when the user resets the game
		*/
		"click button.reset-button" : function(event){
			Meteor.call("resetGame", Session.get('gameID'));
		}
	});

}

if (Meteor.isServer) {

	Meteor.methods({
		/**
		* Attempts to connect to the most recent game, creating one if nessecary.
		*/
		initGame : function(){
			var gameID = null;
			//get all games, ordered by start time
			var activeGames = Games.find({}, {sort: ["startTime"]}).fetch();

			//if there are no games, make one.
			if(activeGames.length == 0){
				gameID = Games.insert({
					startTime: (Date.now()),
					p1Play: null,
					p2Play: null
				});
			}
			else{
				//There are existing games. So use the most recent one
				gameID = activeGames[0]._id;

				//And then get rid of any others
				if(activeGames.length > 1){
					for(var i = 1; i < activeGames.length; i++){
						Games.remove(activeGames[i]._id);
					}
				}
			}

			return gameID;
		},
		/**
		* Resets the current game so that the players can play again.
		* Can only be called once both players have chosen a play.
		*/
		resetGame : function(gameID){
			var game = Games.findOne(gameID);
			//only allow to reset the game after both players have made a play
			if(typeof(game) != "undefined" && game.p1Play != null && game.p2Play != null){
				Games.update(gameID, {
					$set : {
						p1Play : null,
						p2Play : null
					}
				});
			}

		},
		/**
		* Sets the player's play
		*/
		setPlay : function(gameID, playerID, play){
			if(playerID == 1){
				Games.update(gameID, {
					$set: { p1Play : play }
				});
			}
			else{
				Games.update(gameID, {
					$set: { p2Play : play }
				});
			}
		}
	});
}
