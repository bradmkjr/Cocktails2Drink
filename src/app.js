// 

var express = require('express');
var app = express();

var Twit = require('twit');

var Bitly = require('bitly');

var request = require('request');

var pj = require('phrasejumble');

var fs = require('fs');
var Jimp = require("jimp");


var title = '';
var category = '';
var description = '';
var thumbnailURL = '';
var shortURL = ''; 
var longURL = '';
var tweet = '';

var b64content = '';

var response = '';

var search = '';
var list_id = '';

var tags = [	'#DontDrinkAndDrive',
				'#Cocktails',
				'#DrinkRecipes',
				'#DrinkResponsibly',
				'#HappyHour',
				'#ShopLocal',
				'#Spirits',
				'#Liquor',
				'#Cheers',
				'#Shaker',
				'#DrinkTime',
				'#mixology',
				'#bartender'
				];

var ingredients = [];

console.log('Starting Up!!!');

var apiURL = 'https://www.thecocktaildb.com/api/json/v1/1/random.php'

var recipeURL = 'https://www.thecocktaildb.com/drink.php?c='

app.set('port', (process.env.PORT || 5000));

// Discourage general browsers
app.get('/', function(req, res) {
  res.writeHead(403, {'Content-Type': 'text/html'}); 

  res.write('Go Away');
  res.end();
});

app.get('/shaker', function(req, res) {

	var T = new Twit( {
      consumer_key: process.env.twitter_consumer_key,
      consumer_secret: process.env.twitter_consumer_secret,
      access_token: process.env.twitter_access_token,
      access_token_secret: process.env.twitter_access_token_secret
    } );

	res.writeHead(200, {'Content-Type': 'text/html'}); 
	console.log('Starting Shaker...');
	// res.write('Starting Shaker...');
	loadRecipe();

	function loadRecipe(){

		request(apiURL, function(error, response, data){

			// console.log(data);
			// First we'll check to make sure no errors occurred when making the request
	        if(!error){		       
					processRecipe(JSON.parse(data));			
	        }else{
		        console.log('Request FAILED');
	        }
	    });    
	    
	} // end  function loadRecipe
	    
	function processRecipe(data){
		// console.log(data.drinks[0])
		console.log('Title: '+data.drinks[0].strDrink);
		title = data.drinks[0].strDrink;
	    
	    console.log('Description: '+data.drinks[0].strInstructions);
	    description = data.drinks[0].strInstructions;

	    console.log('Long URL: '+recipeURL+data.drinks[0].idDrink);
	    longURL = recipeURL+data.drinks[0].idDrink;

	    thumbnailURL = data.drinks[0].strDrinkThumb

	    ingredients = [];
	    for(i=1;i<15;i++){
	    	if( undefined != data.drinks[0]['strIngredient'+i] && '' != data.drinks[0]['strIngredient'+i].trim() )
	    		ingredients.push(data.drinks[0]['strIngredient'+i])
	    }

	    console.log(ingredients)

	    var bitly = new Bitly( process.env.bitly_access_token );

	    longURL = recipeURL+data.drinks[0].idDrink

		bitly.shorten(longURL)
			.then(function(response) {
			// Do something with data 

			shortURL = response.data.url;
			console.log('Short URL: '+shortURL);
			// res.write('Short URL: '+shortURL);
			
			tweet = statusUpdate( data.drinks[0].strDrink, data.drinks[0].strInstructions, shortURL );
		
			console.log( 'Tweet: ' + tweet );

			waterMark()


		}, function(error) {			
			throw error;
			res.end();
		});

	} // end function processRecipe

	function waterMark(){
		
		// open a file called "lenna.png" 
		Jimp.read(thumbnailURL).then(function (image) {
		    // do stuff with the image 

		    Jimp.read('./src/public/assets/img/large-background.png').then(function (background) {
		    
		    Jimp.read('./src/public/assets/img/twitter-circle.png').then(function (twitter) {
		
		    Jimp.loadFont(Jimp.FONT_SANS_64_BLACK, function (error, fontLargeBlack) {

		    	Jimp.loadFont(Jimp.FONT_SANS_32_BLACK, function (error, fontSmallBlack){

		    		image.composite( background, 0, ( image.bitmap.height - 140 ) )
		    		.composite( twitter, ( image.bitmap.width - 48 ), ( image.bitmap.height - 64 ) )
			    	// .print(fontWhite, 70, ( image.bitmap.height - ( image.bitmap.height / 3 ) ), "@"+process.env.twitter_handle )
			    	.print(fontLargeBlack, 12, ( image.bitmap.height - 136 ), title, (image.bitmap.width) )
			    	.print(fontSmallBlack, ( image.bitmap.width - 312 ), ( image.bitmap.height - 64 ), "@"+process.env.twitter_handle )
			    	.write('./src/public/assets/img/image.processed.jpg', function(){

			    			b64content = fs.readFileSync('./src/public/assets/img/image.processed.jpg', { encoding: 'base64' });

			    			// console.log(item.b64content);

			    			tweetWithMedia();	

			    			
				    	}); // end write callback

			    	}); // end white font callback 

		    	});	// end blackfont font callback	    	

		    });	// end twitter image read
		    
		    });	// end background image read

		}).catch(function (error) {
		    // handle an exception 
		    console.log(error);

		});
		
	}
	
	function tweetWithMedia(){

		// 
		// post a tweet with media 
		// 	
		 
		// first we must post the media to Twitter 
		T.post('media/upload', { media_data: b64content }, function (error, data, response) {
		  // now we can assign alt text to the media, for use by screen readers and 
		  // other text-based presentations and interpreters 
		  
		  if(error != undefined || response.statusCode != 200 ){
		  	console.log("Something went wrong!");
			console.log(error.message);
			console.log(response.statusCode);
			res.end();		  
		  }else{
			  
			  var mediaIdStr = data.media_id_string
			  var meta_params = { media_id: mediaIdStr, alt_text: { text: trimWords(title + ' ' + description, 420) } }
			 
			  T.post('media/metadata/create', meta_params, function (error, data, response) {
			    if(error != undefined || response.statusCode != 200 ){
			      	console.log(error);
			    	console.log(response.statusCode);
			    	
			    	// error with media create
			    	console.log('error creating meta data');
			    		
			    }else{
					// now we can reference the media and post a tweet (media will attach to the tweet) 
					// this is the tweet message
					var tweetData = { status: tweet, media_ids: [mediaIdStr] } 
					
					console.log(tweetData);
					
					T.post('statuses/update', tweetData, function (error, data, response) {

						    if(error != undefined || response.statusCode != 200 ){
									console.log("Something went wrong!");
									console.log(error.message);
									console.log(response.statusCode);
									res.end();
							   
							    }else{
					
						      // res.write('Voila It worked!');
					
						      T.get('statuses/oembed', { "id": data.id_str },  function (error, data, response) {
						      					            
						            if(error != undefined || response.statusCode != 200 ){
										console.log("Something went wrong!");
										console.log(error.message);
										console.log(response.statusCode);
										res.end();
								   
								    }else{
										res.write(data.html);
										console.log('Done!!');
										res.end();
							        }
					            
					         }); // end statuses/oembed
					
						    } // end if
					
						}); // end statuses/update
			    } // end if
			  }); // end media/metadata/create	
			  		  
		  } // end if
		}); // end media/upload

	} // end tweetWithMedia
	
	function createList(item){
		
		var listSlug = '';
		var listDescription = '';

		//
		//  Creates a new list for the authenticated user. Note that you can create up to 1000 lists per account.
		//
		T.post('lists/create', { name: listSlug, description: listDescription  }, function(error, data, response) {
		  // console.log(data);
		  // console.log(data.statuses.length);
		  // console.log(response);
	
		  if( data != undefined && !error && response.statusCode == 200 ){
		  	// res.write(JSON.stringify(data));	
		  		
			  console.log(data);
			  
			//  searchTwitter(item)		
		  	
		  } // end if
		  else if( error )
		  {
			console.log(error);	
			console.log(data);
			console.log(response.statusCode);
		  }
	
		}); // end lists/create
		
	} // createList


}); // end shaker



app.get('/strainer', function(req, res) {

	var T = new Twit( {
      consumer_key: process.env.twitter_consumer_key,
      consumer_secret: process.env.twitter_consumer_secret,
      access_token: process.env.twitter_access_token,
      access_token_secret: process.env.twitter_access_token_secret
    } );

	res.writeHead(200, {'Content-Type': 'text/html'}); 
	console.log('Starting Strainer...');

	search = 'bartending shift';

	list_id = '970175266612916224';

	searchTwitter();

	function searchTwitter(){
	
		console.log('Twitter Search: '+ search);
	
		//
		//  search twitter for all tweets containing the word '#coupon'
		//
		T.get('search/tweets', { q: search, count: 100, result_type: 'mixed' }, function(error, data, response) {
		  // console.log(data);
		  // console.log(error);
		  // console.log(response);
	
		  if( data != undefined && !error && response.statusCode == 200 && data.statuses.length != 0 ){
		  	// res.write(JSON.stringify(data));	
		  	
		  	var status = data.statuses[getRandomRange(0,data.statuses.length)];
	
		  	console.log(status.text);
		  	res.write( 'Tweet: ' + status.text );	
	
		  	// res.write( status.user.id_str );	
		  	res.write( 'User: ' + status.user.name );	
		  	// console.log( status.user.screen_name );	
		  	res.write( 'Screen Name: ' + status.user.screen_name );	
		  	
		  	T.post('friendships/create', { user_id: status.user.id_str }, function(error, data, response) {
	
		  		// console.log(data);
		  		// console.log(response);
	
		  		if( data != undefined && !error && response.statusCode == 200 ){
	
		  			// console.log(response);
		  			console.log('Following Status: ' + data.following);
		  			res.write( 'Following Status: ' + data.following );	

		  			console.log('List ID: '+ list_id);
	
					T.post('lists/members/create', { list_id: list_id, user_id: status.user.id_str, screen_name: status.user.screen_name }, function(error, data, response) {
	
				  		// console.log(data);
				  		// console.log(response);
	
				  		if( data != undefined && !error && response.statusCode == 200 ){
	
				  			// console.log(response);
				  			console.log( data.member_count );
				  			res.write( 'Member Count: '+data.member_count );	
				  			// console.log(data);
				  		}
				  		else if( error )
				  		{
							console.log(error);	  			
				  		}
	
				  		res.end();	
				  	});
	
		  		}
		  		else if( error )
		  		{
					console.log(error);	  			
		  		}
	
		  		// res.end();	
	
		  	});
		  	
		  } // end if
		  else if( error )
		  {
			console.log(error);	
			console.log(data);
			console.log(response.statusCode);
		  }
		  
	
		}); // end search/tweets
		
		
	} // end function searchTwitter

	// createList()

	function createList(){
		
		var listSlug = 'ProfessionalBartenders';
		var listDescription = 'Professionals preparing alcoholic or non-alcoholic beverages for bar and patrons';

		//
		//  Creates a new list for the authenticated user. Note that you can create up to 1000 lists per account.
		//
		T.post('lists/create', { name: listSlug, description: listDescription  }, function(error, data, response) {
		  // console.log(data);
		  // console.log(data.statuses.length);
		  // console.log(response);
	
		  if( data != undefined && !error && response.statusCode == 200 ){
		  	// res.write(JSON.stringify(data));	
		  		
			  console.log(data);
			  
			//  searchTwitter(item)		
		  	
		  } // end if
		  else if( error )
		  {
			console.log(error);	
			console.log(data);
			console.log(response.statusCode);
		  }
	
		}); // end lists/create
		
	} // createList

}); // end strainer


app.get('/icebucket', function(req, res) {

	var T = new Twit( {
      consumer_key: process.env.twitter_consumer_key,
      consumer_secret: process.env.twitter_consumer_secret,
      access_token: process.env.twitter_access_token,
      access_token_secret: process.env.twitter_access_token_secret
    } );

	res.writeHead(200, {'Content-Type': 'text/html'}); 
	console.log('Starting Strainer...');

	search = 'professional bartender';

	list_id = '970175266612916224';

	searchTwitter();

	function searchTwitter(){
	
		console.log('Twitter Search: '+ search);
	
		//
		//  search twitter for all tweets containing the word '#coupon'
		//
		T.get('search/tweets', { q: search, count: 100, result_type: 'mixed' }, function(error, data, response) {
		  // console.log(data);
		  // console.log(error);
		  // console.log(response);
	
		  if( data != undefined && !error && response.statusCode == 200 && data.statuses.length != 0 ){
		  	// res.write(JSON.stringify(data));	
		  	
		  	var status = data.statuses[getRandomRange(0,data.statuses.length)];
	
		  	console.log(status.text);
		  	res.write( 'Tweet: ' + status.text );	
	
		  	// res.write( status.user.id_str );	
		  	res.write( 'User: ' + status.user.name );	
		  	// console.log( status.user.screen_name );	
		  	res.write( 'Screen Name: ' + status.user.screen_name );	
		  	
		  	T.post('friendships/create', { user_id: status.user.id_str }, function(error, data, response) {
	
		  		// console.log(data);
		  		// console.log(response);
	
		  		if( data != undefined && !error && response.statusCode == 200 ){
	
		  			// console.log(response);
		  			console.log('Following Status: ' + data.following);
		  			res.write( 'Following Status: ' + data.following );	

		  			console.log('List ID: '+ list_id);
	
					T.post('lists/members/create', { list_id: list_id, user_id: status.user.id_str, screen_name: status.user.screen_name }, function(error, data, response) {
	
				  		// console.log(data);
				  		// console.log(response);
	
				  		if( data != undefined && !error && response.statusCode == 200 ){
	
				  			// console.log(response);
				  			console.log( data.member_count );
				  			res.write( 'Member Count: '+data.member_count );	
				  			// console.log(data);
				  		}
				  		else if( error )
				  		{
							console.log(error);	  			
				  		}
	
				  		res.end();	
				  	});
	
		  		}
		  		else if( error )
		  		{
					console.log(error);	  			
		  		}
	
		  		// res.end();	
	
		  	});
		  	
		  } // end if
		  else if( error )
		  {
			console.log(error);	
			console.log(data);
			console.log(response.statusCode);
		  }
		  
	
		}); // end search/tweets
		
		
	} // end function searchTwitter

	// createList()

	function createList(){
		
		var listSlug = 'ProfessionalBartenders';
		var listDescription = 'Professionals preparing alcoholic or non-alcoholic beverages for bar and patrons';

		//
		//  Creates a new list for the authenticated user. Note that you can create up to 1000 lists per account.
		//
		T.post('lists/create', { name: listSlug, description: listDescription  }, function(error, data, response) {
		  // console.log(data);
		  // console.log(data.statuses.length);
		  // console.log(response);
	
		  if( data != undefined && !error && response.statusCode == 200 ){
		  	// res.write(JSON.stringify(data));	
		  		
			  console.log(data);
			  
			//  searchTwitter(item)		
		  	
		  } // end if
		  else if( error )
		  {
			console.log(error);	
			console.log(data);
			console.log(response.statusCode);
		  }
	
		}); // end lists/create
		
	} // createList

}); // end icebucket


app.get('/garnish', function(req, res) {

	var T = new Twit( {
      consumer_key: process.env.twitter_consumer_key,
      consumer_secret: process.env.twitter_consumer_secret,
      access_token: process.env.twitter_access_token,
      access_token_secret: process.env.twitter_access_token_secret
    } );

	res.writeHead(200, {'Content-Type': 'text/html'}); 
	console.log('Starting Strainer...');

	search = 'bartending pro';

	list_id = '970175266612916224';

	searchTwitter();

	function searchTwitter(){
	
		console.log('Twitter Search: '+ search);
	
		//
		//  search twitter for all tweets containing the word '#coupon'
		//
		T.get('search/tweets', { q: search, count: 100, result_type: 'mixed' }, function(error, data, response) {
		  // console.log(data);
		  // console.log(error);
		  // console.log(response);
	
		  if( data != undefined && !error && response.statusCode == 200 && data.statuses.length != 0 ){
		  	// res.write(JSON.stringify(data));	
		  	
		  	var status = data.statuses[getRandomRange(0,data.statuses.length)];
	
		  	console.log(status.text);
		  	res.write( 'Tweet: ' + status.text );	
	
		  	// res.write( status.user.id_str );	
		  	res.write( 'User: ' + status.user.name );	
		  	// console.log( status.user.screen_name );	
		  	res.write( 'Screen Name: ' + status.user.screen_name );	
		  	
		  	T.post('friendships/create', { user_id: status.user.id_str }, function(error, data, response) {
	
		  		// console.log(data);
		  		// console.log(response);
	
		  		if( data != undefined && !error && response.statusCode == 200 ){
	
		  			// console.log(response);
		  			console.log('Following Status: ' + data.following);
		  			res.write( 'Following Status: ' + data.following );	

		  			console.log('List ID: '+ list_id);
	
					T.post('lists/members/create', { list_id: list_id, user_id: status.user.id_str, screen_name: status.user.screen_name }, function(error, data, response) {
	
				  		// console.log(data);
				  		// console.log(response);
	
				  		if( data != undefined && !error && response.statusCode == 200 ){
	
				  			// console.log(response);
				  			console.log( data.member_count );
				  			res.write( 'Member Count: '+data.member_count );	
				  			// console.log(data);
				  		}
				  		else if( error )
				  		{
							console.log(error);	  			
				  		}
	
				  		res.end();	
				  	});
	
		  		}
		  		else if( error )
		  		{
					console.log(error);	  			
		  		}
	
		  		// res.end();	
	
		  	});
		  	
		  } // end if
		  else if( error )
		  {
			console.log(error);	
			console.log(data);
			console.log(response.statusCode);
		  }
		}); // end search/tweets		
	} // end function searchTwitter

}); // end garnish



app.get('/glassware', function(req, res) {

	var T = new Twit( {
      consumer_key: process.env.twitter_consumer_key,
      consumer_secret: process.env.twitter_consumer_secret,
      access_token: process.env.twitter_access_token,
      access_token_secret: process.env.twitter_access_token_secret
    } );

	res.writeHead(200, {'Content-Type': 'text/html'}); 
	console.log('Starting Strainer...');

	search = 'mixology';

	list_id = '970175266612916224';

	searchTwitter();

	function searchTwitter(){
	
		console.log('Twitter Search: '+ search);
	
		//
		//  search twitter for all tweets containing the word '#coupon'
		//
		T.get('search/tweets', { q: search, count: 100, result_type: 'mixed' }, function(error, data, response) {
		  // console.log(data);
		  // console.log(error);
		  // console.log(response);
	
		  if( data != undefined && !error && response.statusCode == 200 && data.statuses.length != 0 ){
		  	// res.write(JSON.stringify(data));	
		  	
		  	var status = data.statuses[getRandomRange(0,data.statuses.length)];
	
		  	console.log(status.text);
		  	res.write( 'Tweet: ' + status.text );	
	
		  	// res.write( status.user.id_str );	
		  	res.write( 'User: ' + status.user.name );	
		  	// console.log( status.user.screen_name );	
		  	res.write( 'Screen Name: ' + status.user.screen_name );	
		  	
		  	T.post('friendships/create', { user_id: status.user.id_str }, function(error, data, response) {
	
		  		// console.log(data);
		  		// console.log(response);
	
		  		if( data != undefined && !error && response.statusCode == 200 ){
	
		  			// console.log(response);
		  			console.log('Following Status: ' + data.following);
		  			res.write( 'Following Status: ' + data.following );	

		  			console.log('List ID: '+ list_id);
	
					T.post('lists/members/create', { list_id: list_id, user_id: status.user.id_str, screen_name: status.user.screen_name }, function(error, data, response) {
	
				  		// console.log(data);
				  		// console.log(response);
	
				  		if( data != undefined && !error && response.statusCode == 200 ){
	
				  			// console.log(response);
				  			console.log( data.member_count );
				  			res.write( 'Member Count: '+data.member_count );	
				  			// console.log(data);
				  		}
				  		else if( error )
				  		{
							console.log(error);	  			
				  		}
	
				  		res.end();	
				  	});
	
		  		}
		  		else if( error )
		  		{
					console.log(error);	  			
		  		}
	
		  		// res.end();	
	
		  	});
		  	
		  } // end if
		  else if( error )
		  {
			console.log(error);	
			console.log(data);
			console.log(response.statusCode);
		  }
		}); // end search/tweets		
	} // end function searchTwitter

}); // end glassware

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});



function statusUpdate( title, description, shortURL ){

  var statusUpdate = '';

  var optionalTag = (getRandomRange(0,tags.length) > 4)?' '+ tags[getRandomRange(0,tags.length)] +' ':'';

  var optionalIngredients = ingredients.join(', ');

  var maxLength = 279 - ( title.length + 2 + shortURL.length + optionalTag.length + 1 + optionalIngredients.length + 1 );
  
  console.log(maxLength);

  statusUpdate = title + ' ' + shortURL + ' ' + trimWords(description, maxLength) + optionalTag + ' ' + optionalIngredients;

  return statusUpdate;
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function getRandomRange(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function trimWords(description, maxLength){
	if( description.length < maxLength ){
		return description
	}
	description = description.replace(/\s\s+/g, ' ')

	description = description.substring(0, maxLength);

	var length = maxLength;
	// console.log(length);
	for (var i = maxLength - 1; i >= 0; i--) {
		if(description[i] == ' '){
			length = i;
			break;
		}	
	};
	// console.log(length);

	return description.substring(0, length);
}