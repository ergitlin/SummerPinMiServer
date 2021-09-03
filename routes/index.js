var express = require('express');
var router = express.Router();
var path = require('path');
var _ = require('lodash');
const cors = require('cors');


var apiKey = process.env.TOKBOX_API_KEY;
var secret = process.env.TOKBOX_SECRET;

if (!apiKey || !secret) {
  console.error('=========================================================================================================');
  console.error('');
  console.error('Missing TOKBOX_API_KEY or TOKBOX_SECRET');
  console.error('Find the appropriate values for these by logging into your TokBox Dashboard at: https://tokbox.com/account/#/');
  console.error('Then add them to ', path.resolve('.env'), 'or as environment variables' );
  console.error('');
  console.error('=========================================================================================================');
  process.exit();
}

// IMPORTANT: roomToSessionIdDictionary is a variable that associates room names with unique
// unique session IDs. However, since this is stored in memory, restarting your server will
// reset these values if you want to have a room-to-session association in your production
// application you should consider a more persistent storage

var roomToSessionIdDictionary = {};

// returns the room name, given a session ID that was associated with it
function findRoomFromSessionId(sessionId) {
  return _.findKey(roomToSessionIdDictionary, function (value) { return value === sessionId; });
}

router.get('/', function (req, res) {
  res.render('index', { title: 'Learning-OpenTok-Node' });
});

router.get('/test1', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  //with no cors headers
  res.send({
    message: "test1 worked"
  });
});

router.get('/test2', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  //with only Access-Control-Allow-Origin header
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send({
    message: "test2 worked"
  });
});

router.get('/test3', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with no cors headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.send({
      message: "test3 worked"
    });
});

router.get('/test4', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with current headers
    res.setHeader('Access-Control-Allow-Methods', "OPTIONS, POST, GET, PUT");
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Vary', 'Origin');
    res.send({
      message: "test4 worked"
    });
});

router.get('/test4', cors(), function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with cors library
    res.send({
      message: "test5 worked"
    });
});

router.options('/test5', cors())

router.get('/test5', cors(), function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with cors library and preflight request handled
    res.send({
      message: "test5 worked"
    });
});

/**
 * GET /session redirects to /room/session
 */
router.get('/session', function (req, res) {
  res.redirect('/room/session');
});

/**
 * GET /room/:name
 */
router.get('/room/:name', function (req, res) {
  var roomName = req.params.name;
  var sessionId;
  var token;
  console.log('attempting to create a session associated with the room: ' + roomName);

  // if the room name is associated with a session ID, fetch that
  if (roomToSessionIdDictionary[roomName]) {
    sessionId = roomToSessionIdDictionary[roomName];

    // generate token
    token = opentok.generateToken(sessionId);
    console.log('token' + token);
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', "OPTIONS, POST, GET, PUT");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send({
      roomname: roomName,
      apiKey: apiKey,
      sessionId: sessionId,
      token: token
    });
  }
  // if this is the first time the room is being accessed, create a new session ID
  else {
    opentok.createSession({ mediaMode: 'routed' }, function (err, session) {
      if (err) {
        console.log(err);
        res.status(500).send({ error: 'createSession error:' + err });
        return;
      }

      // now that the room name has a session associated wit it, store it in memory
      // IMPORTANT: Because this is stored in memory, restarting your server will reset these values
      // if you want to store a room-to-session association in your production application
      // you should use a more persistent storage for them
      roomToSessionIdDictionary[roomName] = session.sessionId;

      console.log("first access");

      // generate token
      token = opentok.generateToken(session.sessionId);
      res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Origin, X-Requested-With, Content-type, Accept, Vary");
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', "OPTIONS, POST, GET, PUT");
      res.setHeader('Vary', 'Origin');
      //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
      res.send({
        apiKey: apiKey,
        sessionId: session.sessionId,
        token: token
      });
    });
  }
});

/**
 * POST /archive/start
 */
router.post('/archive/start', function (req, res) {
  const { sessionId, resolution, outputMode, hasVideo} = req.body;
  //var sessionId = json.sessionId;
  opentok.startArchive(sessionId, 
    { name: findRoomFromSessionId(sessionId), resolution: resolution, outputMode: outputMode, hasVideo: hasVideo},
    function (err, archive) {
    if (err) {"Unexpected response from OpenTok"
      console.error('error in startArchive');
      console.error(err.type);
      res.status(500).send({ error: 'startArchive error:' + err });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archive);
  });
});

/**
 * POST /archive/:archiveId/stop
 */
router.post('/archive/:archiveId/stop', function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to stop archive: ' + archiveId);
  opentok.stopArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in stopArchive');
      console.error(err);
      res.status(500).send({ error: 'stopArchive error:' + err });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archive);
  });
});

/**
 * GET /archive/:archiveId/view
 */
router.get('/archive/:archiveId/view', function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to view archive: ' + archiveId);
  opentok.getArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in getArchive');
      console.error(err);
      res.status(500).send({ error: 'getArchive error:' + err });
      return;
    }

    if (archive.status === 'available') {
      console.log("archive status: ", archive.status)
      res.redirect(archive.url);
    } else {
      console.log("archive status: ", archive.status)
      res.render('view', { title: 'Archiving Pending' });
    }
  });
});

/**
 * GET /archive/:archiveId
 */
router.get('/archive/:archiveId', function (req, res) {
  var archiveId = req.params.archiveId;

  // fetch archive
  console.log('attempting to fetch archive: ' + archiveId);
  opentok.getArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in getArchive');
      console.error(err);
      res.status(500).send({ error: 'getArchive error:' + err });
      return;
    }

    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archive);
  });
});

/**
 * GET /archive
 */
router.get('/archive', function (req, res) {
  var options = {};
  if (req.query.count) {
    options.count = req.query.count;
  }
  if (req.query.offset) {
    options.offset = req.query.offset;
  }

  // list archives
  console.log('attempting to list archives');
  opentok.listArchives(options, function (err, archives) {
    if (err) {
      console.error('error in listArchives');
      console.error(err);
      res.status(500).send({ error: 'infoArchive error:' + err });
      return;
    }

    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archives);
  });
});

module.exports = router;
