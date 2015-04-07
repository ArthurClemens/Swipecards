'use strict';

var app = {};

app.getCards = function() {
    m.startComputation();
    var deferred = m.deferred(),
    	stored = localStorage.getItem(SP_KEY);

    if (stored) {
        deferred.resolve(JSON.parse(stored));
        m.endComputation();
    } else {
        app.fetchData(SP_KEY, function(data) {
            localStorage.setItem(SP_KEY, JSON.stringify(data));
            deferred.resolve(data);
            m.endComputation();
        });
    }
    return deferred.promise;
};

app.storeData = function(data) {
	localStorage.setItem(SP_KEY, JSON.stringify(data));
};

app.clearData = function() {
	localStorage.removeItem(SP_KEY);
};

app.fetchData = function(key, callback) {
    Tabletop.init({
        key: key,
        callback: callback,
        simpleSheet: true
    });
};

app.vm = {};
app.vm.init = function() {
    this.cards = new app.getCards();
    this.cardData = m.prop();
    app.vm.updateCardData();
};
app.vm.done = function(card) {
    card.done = true;
    app.storeData(app.vm.cards);
    app.vm.updateCardData();
};
app.vm.info = function(card) {
	console.log("info", card);
	card.info = !card.info;
};
app.vm.next = function() {
    console.log('next');
    app.vm.updateCardData();
};
app.vm.updateCardData = function() {
	console.log("app.vm.updateCardData");
	var all = app.vm.cards();
    var remaining = _.filter(all, function(c) {
    	return c.done !== true;
    });
    var current = _.sample(remaining, 1)[0];
    this.cardData({
    	all: all,
    	remaining: remaining,
    	current: current
    });
};
app.controller = function() {
    app.vm.init();
};

app.view = function() {
	console.log("view");
	var cardData = app.vm.cardData(),
		card = cardData.current;
	console.log("cardData", cardData);
    return m('.card', [
    	m('.info-row[horizontal][layout]', [
    		m('span[flex]', cardData.all.length),
    		m('span[flex]'),
    		m('span[flex]', (cardData.all.length - cardData.remaining.length))
    	]),
    	card.info ? m('.card-inner[horizontal][layout][center]', [
        	m('.info', m('span', card[FRONT_KEY] + ':'), m('br'), card[BACK_KEY])
        ]) : m('.card-inner[horizontal][layout][center][center-justified]', [
        	m('div', card[FRONT_KEY])
        ]),
        m('.button-row[horizontal][layout]', [
            m('a[flex]', {onclick: app.vm.next.bind(app.vm, card)}, 'No'),
            m('a[flex]', {onclick: app.vm.info.bind(app.vm, card)}, 'Info'),
            m('a[flex]', {onclick: app.vm.done.bind(app.vm, card)}, 'Yes')
        ])
    ]);
};

m.module(document.body, app);