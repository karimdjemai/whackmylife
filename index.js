const axios = require('axios');
const Bot = require('node-telegram-bot-api');
const token = '596501747:AAHQiAwiT3uyLB939LsWRf3GOt05-Jp-QHo';
const bot = new Bot(token, {polling: true});
var objects = [];
const fs = require('fs');
const request = require('request');
const Jimp = require("jimp");


function download(uri, filename)
{
  return new Promise(function(resolve, reject) {
    request.head(uri, function(err, res, body)
    {
      console.log('content-type:', res.headers['content-type']);
      console.log('content-length:', res.headers['content-length']);
      if (err) {
        console.log(err)
        reject(err)
      }
      request(uri).pipe(fs.createWriteStream(filename)).on('close', () => {resolve();});

    })
  })
}

function sendMyImage(msg)
{
  requestMood(msg)
  console.log('file_id: ' + msg.photo[msg.photo.length - 1].file_id)
  axios.get('https://api.telegram.org/bot'+token+'/getFile?file_id=' + msg.photo[msg.photo.length - 1].file_id)
  .then(file =>
  {
    console.log('file_path: ' + file.data.result.file_path)
    axios.get('https://api.telegram.org/file/bot'+token+'/' + file.data.result.file_path)
    .then(img =>
    {
      console.log('image_url: ' + img.config.url)
      download(img.config.url, file.data.result.file_path.split('/')[1])
      .then(() =>
      {
        console.log('Downloaded image ' + file.data.result.file_path.split('/')[1] + ' successfully')
        makeNewImage(file.data.result.file_path.split('/')[1], msg.chat.id).then( () =>
        {
          });
        });
      });
    });
}

function makeNewImage(path, id)
{
  return new Promise(function(resolve, reject)
   {
    console.log('Starting image editing on ' + path + ' ...')
    var img_string = './' + path
    var img_string_edited = id + '.jpg'
    Jimp.read(img_string).then(face =>
    {
      console.log('First editing step ...');
      face.scaleToFit(125,125)
      var hintergrund = hintergrundAusData(id)
      Jimp.read('./sourceimages/' + hintergrund + '.jpg').then(shelter =>
      {
        console.log('Second editing step ...');
          var height = face.bitmap.height
          var width = face.bitmap.width
          shelter.blit(face, 345, 105)
          shelter.write(img_string_edited)
          console.log('Done editing');
          resolve()
        }).catch(err => console.log(err));
      }).catch(err => console.log(err));
    }).catch(err => console.log(err));
}

//Hier wird der Userinput abgefragt. Die Nutzer müssen die bestimmten symbole benutzen, damit das System
//es versteht.

bot.onText(/\/start/, (msg) =>
{
  console.log("first");
  console.log("App started by " + msg.chat.username);
  requestGeschlecht(msg);
})

bot.on('message', (msg) => {
  if (typeof msg.photo !== 'undefined' )
  {
    console.log('Image recieved ...')
    sendMyImage(msg);
  }
  else if(msg.text === '👨🏻' || msg.text === '👩🏻' || msg.text === '🍕')
  {
    console.log(msg.chat.username + " hat sein Geschlecht angegeben");
    geschlechtSpeichern(msg);
    requestAlter(msg);
  }
  else if(!isNaN(msg.text))
  {
    console.log(msg.chat.username + " hat sein Alter angegeben");
    alterSpeichern(msg);
    requestTier(msg);
  }
  //Die Gewissensabfrage steht vor der Tierabfrage, da hier auch ein Tier benötigt wird.
  //Wenn für den Nutzer ein Tier gespeichert ist gilt tiereingabe als gewissensbeantwortung.
  //Nach der Genderabfrage wird alles was gespeichert ist gelöscht. Eine Gender eingabe bietet also die möglichkeit sein Lieblingstier zu ändern #whack
  else if(msg.text === getTierVonChat(msg.chat.id) || msg.text === '💰')
  {
    console.log(msg.chat.username + " hat sich für etwas entschieden");
    gewissenSpeichern(msg);
    requestPhoto(msg);
  }
  else if(msg.text === '🐱' || msg.text === '🐶')
  {
    console.log(msg.chat.username + " feiert ein Tier");
    tierSpeichern(msg);
    requestGeldorTier(msg);
  }
  else if(msg.text === '😍' || msg.text === '🙂' || msg.text === '😡')
  {
    console.log(msg.chat.username + " geht es");
    moodSpeichern(msg);
    requestEnd(msg);
  }
  else if(msg.text === '💯')
  {
    console.log('Preparing to send image ...');
    fs.readFile('./' + msg.chat.id + '.jpg', function (err, image)
    {
      if (err)
      {
        console.log(err);
      }
      bot.sendPhoto(msg.chat.id, image);
      ausgabeVorbereiten(msg);
      console.log('Image (soon) sent back');
      fs.readdir('./', (err, files) => {
        files.forEach(file => {
          if (file.includes('file_') || imageContainsonlyNumbersAndIsNotNew(file, msg.chat.id)) {
              fs.unlink(file)
          }
        });
      })
    });
  }
});


function imageContainsonlyNumbersAndIsNotNew(file, id)
{
  filename = file.split(".")[0];
  filetype = file.split(".")[1];

  if(filetype == ".jpg" && !isNaN(filename) && filename != id) console.log(file);
  return filetype == ".jpg" && !isNaN(filename) && filename != id;
}


function requestGeschlecht(msg)
{
  //Abfrage nach Geschlecht
  const options =
  {
      reply_markup: JSON.stringify({
        one_time_keyboard: true,
        resize_keyboard: true,
        keyboard: [['👨🏻','👩🏻','🍕']]
      })
    };
  bot.sendMessage(msg.chat.id, "So, you need a new dating profile ... let's see how I can help.")
  bot.sendMessage(msg.chat.id, "First, tell me your gender.", options)
}


function requestAlter(msg)
{
    //Abfrage nach Alter
    bot.sendMessage(msg.chat.id, "⏳ What is your age in years? 👶🏻");
}

function requestTier(msg)
{
  //Abfrage nach Tier
  const options =
  {
      reply_markup: JSON.stringify({
        one_time_keyboard: true,
        resize_keyboard: true,
        keyboard: [['🐱','🐶']]
      })
    };
  bot.sendMessage(msg.chat.id, "U more of a meow or a woof person?", options)
}

function requestMood(msg)
{
  //Abfrage nach Tier
  const options =
  {
      reply_markup: JSON.stringify({
        one_time_keyboard: true,
        resize_keyboard: true,
        keyboard: [['😍','🙂','😡']]
      })
    };
  bot.sendMessage(msg.chat.id, "You're a model. 😉")
  bot.sendMessage(msg.chat.id, "How do you feel?", options)
}

function requestGeldorTier(msg)
{
  //Abfrage nach Gewissen.
  var emoji = msg.text
  const options =
  {
      reply_markup: JSON.stringify({
        one_time_keyboard: true,
        resize_keyboard: true,
        keyboard: [[emoji,'💰']]
      })
    };
  bot.sendMessage(msg.chat.id, "🏝️ What would you rather take with you on a lonely island? 🏝️", options);
}

function requestPhoto(msg)
{
  bot.sendMessage(msg.chat.id, "Certainly the right choice!")
  bot.sendMessage(msg.chat.id, "Now, please send a photo of you and crop it so if fits your face, like this one:")
  fs.readFile('./sourceimages/merkeln.jpg', function (err, image)
  {
    if (err)
    {
      console.log(err);
    }
    bot.sendPhoto(msg.chat.id, image);
  })
}

function requestEnd(msg)
{
  const options =
  {
      reply_markup: JSON.stringify({
        one_time_keyboard: true,
        resize_keyboard: true,
        keyboard: [['💯']]
      })
    };
  bot.sendMessage(msg.chat.id, "Are you ready for your whack new profile?", options)

}

//kümmert sich darum, dass das gender gespeichert wird. Verantwortet die Erzeugung eines neuen Objektes in Data wenn es noch keins mit der richtigen
//chat-id gibt.
function geschlechtSpeichern(msg)
{
  console.log(msg.text);
  addObjIfNew(msg.chat.id);
  addGeschlechtToData(msg.text, msg.chat.id);
  console.log(objects);
  //die anderen felder werden leer gemacht. Da die Telegrameingabe eines empty-strings nicht
  //möglich ist stellt es für die gewissensabfrage kein problem da das Tier auf '' zu setzen.
  addAlterToData('', msg.chat.id);
  addTierToData('', msg.chat.id);
  addGewissenToData('', msg.chat.id);
}
//kümmert sich darum, dass das alter gespeichert wird. Verantwortet die Erzeugung eines neuen Objektes in Data wenn es noch keins mit der richtigen
//chat-id gibt.
function alterSpeichern(msg)
{
  console.log(msg.text);
  addObjIfNew(msg.chat.id)
  addAlterToData(msg.text, msg.chat.id);
  console.log(objects);
}
//kümmert sich darum, dass das tier gespeichert wird. Verantwortet die Erzeugung eines neuen Objektes in Data wenn es noch keins mit der richtigen
//chat-id gibt.
function tierSpeichern(msg)
{
  console.log(msg.text);
  addObjIfNew(msg.chat.id);
  addTierToData(msg.text, msg.chat.id);
  console.log(objects);
}
//kümmert sich darum, dass das gewissen gespeichert wird. Verantwortet die Erzeugung eines neuen Objektes in Data wenn es noch keins mit der richtigen
//chat-id gibt.
function gewissenSpeichern(msg)
{
  console.log(msg.text);
  addObjIfNew(msg.chat.id);
  addGewissenToData(msg.text, msg.chat.id);
  console.log(objects);
}
//kümmert sich darum, dass die Stimmung gespeichert wird. Verantwortet die Erzeugung eines neuen Objektes in Data wenn es noch keins mit der richtigen
//chat-id gibt.
function moodSpeichern(msg)
{
  console.log(msg.text);
  addObjIfNew(msg.chat.id);
  addMoodToData(msg.text, msg.chat.id);
  console.log(objects);
}

//Erzeugt ein neues Objekt in Date falls es noch keins mit der aktuellen Chat-ID gibt.
function addObjIfNew(id)
{
  for (var obj of objects)
  {
    if(id === obj.chat)
    {
      return;
    }
  }
  newObjectinData(id);
}

//Fügt das neue Objekt hinzu
function newObjectinData(id)
{
  objects = objects.concat([{
    chat:id,
    gender:'',
    age:'',
    animal:'',
    gewissen:'',
    mood:'',
  }])
  console.log("neues obj hinzugefügt");
}




//speichert das Geschlecht in due Daten.
function addGeschlechtToData(text, id)
{
  console.log(objects);
  for(var obj of objects)
  {
    if (obj.chat === id)
    {
      obj.gender = text;
      return;
    }
  }
  console.error(msg + " objekt war noch nicht erstellt und wurde nicht hinzugefügt");
}

//speichert die Stimmung in die Daten.
function addMoodToData(text, id)
{
  console.log(objects);
  for(var obj of objects)
  {
    if (obj.chat === id)
    {
      obj.mood = text;
      return;
    }
  }
  console.error(msg + " objekt war noch nicht erstellt und wurde nicht hinzugefügt");
}

//speichert das Alter in die Daten.
function addAlterToData(text, id)
{
  for(var obj of objects)
  {
    if (obj.chat === id)
    {
      obj.age = text;
      return;
    }
  }
  console.error(msg + " objekt war noch nicht erstellt und wurde nicht hinzugefügt");
}

//speichert das Tier in die Daten.
function addTierToData(text, id)
{
  for(var obj of objects)
  {
    if (obj.chat === id)
    {
      obj.animal = text;
      return;
    }
  }
   console.error(msg + " objekt war noch nicht erstellt und wurde nicht hinzugefügt");
}

//speichert das Gewissen in die Daten.
function addGewissenToData(text, id)
{
  for(var obj of objects)
  {
    if (obj.chat === id)
    {
      obj.gewissen = text;
      return;
    }
  }
  console.error(msg + " objekt war noch nicht erstellt und wurde nicht hinzugefügt");
}

//Hilfsfunktions für die gewissensabfrage
function getTierVonChat(id)
{
  for (var obj of objects)
  {
    if (obj.chat === id)
    {
      return obj.animal;
    }
  }
}



function ausgabeVorbereiten(msg)
{
  //TODO: checken ob alle felder im richtigen objekt voll sind sonst von vorne anfangen!
  var chatid = msg.chat.id;
  var obj;

  if (typeof objFromData(chatid) == 'undefined')
  {
    console.log("objekt wird nachgeschossen");
    obj = objFromData(chatid)
  }
  console.log(msg.chat.id);
  console.log(objects);
  var alter = objFromData(msg.chat.id).age;
  var animal = ''
  if (objFromData(msg.chat.id).animal === '🐶') {
    animal = 'dogs'
  }
  else if (objFromData(msg.chat.id).animal === '🐱') {
    animal = 'cats'
  }
  else {
    animal = 'money'
  }
  var bio = '';
  axios.get('http://numbersapi.com/'+alter+'/trivia?notfound=floor&fragment')
  .then(response =>
    {
      var antwort = response.data;
      bio = "Hey cutie! My name is " + msg.from.first_name + " and I love " + animal + ". I am " + alter + " years old, which by the way also is " + antwort + ".";
      if (objFromData(msg.chat.id).mood === '😡') {
        bio = bio.toUpperCase()
        bio = bio.replace('.','!!1!!1')
      }
      if (objFromData(msg.chat.id).mood === '😍') {
        bio = bio.replace('.','. ❤️')
        bio = '❤️❤️❤️ ' + bio + ' ❤️❤️❤️'
      }
      return bot.sendMessage(chatid, 'Your new Tinder Bio:');
    })
    .then( () => {
      return bot.sendMessage(chatid, bio)
    })
    .catch(err => console.log(err))
}


function objFromData(id)
{
  for (var obj of objects)
  {
    if (obj.chat === id)
    {
      return obj;
    }
  }
  console.error("object nicht gefunden");
  // object initialisieren
  newObjectinData(id);
}


function hintergrundAusData(id)
{
  for (var obj of objects)
  {
    if (obj.chat === id)
    {
      var hintergrund = ''
      if (obj.gender === '🍕') {
        hintergrund += 'pizza-'
      }
      else if (obj.gender === '👨🏻') {
        hintergrund += 'man-'
      }
      else {
        hintergrund += 'woman-'
      }
      if (obj.gewissen === '🐶') {
        hintergrund += 'dogs'
      }
      else if (obj.gewissen === '🐱') {
        hintergrund += 'cats'
      }
      else {
        hintergrund += 'money'
      }
      return hintergrund
    }
  }
  console.error("object nicht gefunden");
}
