const crypto = require('crypto');
const i18next = require('i18next');

const router = require('express').Router();

const { Signale } = require('signale');

const signale = new Signale({ scope: 'Routes' });

const processAction = require('@client/actionsManager');
const getChannel = require('@root/database/channel');
const GloEvents = require('@client/GloEvents');

const client = require('@client');

router.post('/slack', processAction);

router.post('/glo/:channel',
  // Verify signature
  (req, res, next) => {
    const channel = getChannel(req.params.channel);
    const hash = crypto.createHmac('sha1', channel.secret).update(req.buf, 'utf-8').digest('hex');
    const signature = `sha1=${hash}`;

    if(signature !== req.headers['x-gk-signature']) {
      return res.status(403).send('invalid signature');
    }

    next();
  },
  // Process webhook
  (req, res) => {
    const event = req.headers['x-gk-event'];
    const { action } = req.body;

    try {
      const channel = getChannel(req.params.channel);

      const i18nextInstance = i18next.cloneInstance({ lng: channel.language });

      const message = GloEvents[event][action](req.body, i18nextInstance);

      if(message) await client.chat.postMessage({ ...message, channel: channel.id });
    } catch(err) {
      signale.error(err);
      return res.sendStatus(400);
    }

    res.sendStatus(204);
  });

module.exports = router;
