'use strict';

// config values
var set;

var app = {};

app.getCards = function() {
    m.startComputation();
    var deferred = m.deferred(),
    	stored = localStorage.getItem(set.key);

    if (stored) {
        deferred.resolve(JSON.parse(stored));
        m.endComputation();
    } else {
        app.fetchData(set.key, function(data) {
            localStorage.setItem(set.key, JSON.stringify(data));
            deferred.resolve(data);
            m.endComputation();
        });
    }
    return deferred.promise;
};

app.storeData = function(data) {
	localStorage.setItem(set.key, JSON.stringify(data));
};

app.clearData = function() {
	localStorage.removeItem(set.key);
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
    this.cards = m.prop([]);
    //app.clearData();
    this.inited = m.prop(false);
    this.cardData = m.prop();
    this.cards = new app.getCards();
};
app.vm.done = function(card) {
    card.done = true;
    app.storeData(app.vm.cards);
    app.vm.updateCardData();
};
app.vm.info = function(card) {
	card.info = !card.info;
};
app.vm.next = function() {
    app.vm.updateCardData();
};
app.vm.updateCardData = function() {
	var all = app.vm.cards();
    var remaining = _.filter(all, function(c) {
    	return c.done !== true;
    });
    var current;
    if (remaining.length === 0) {
        current = undefined;
    } else if (remaining.length === 1) {
        current = remaining[0];
    } else {
        current = _.sample(remaining, 1)[0];
    }
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
    if (!app.vm.inited()) {
        app.vm.updateCardData();
        app.vm.inited(true);
    }
	var cardData = app.vm.cardData(),
		card = cardData.current;
    return m('.card', [
    	m('.info-row[horizontal][layout]', [
    		m('span[flex]', cardData.remaining.length),
    		m('span[flex]'),
    		m('span[flex]', (cardData.all.length - cardData.remaining.length))
    	]),
    	card.info ? m('.card-inner[horizontal][layout][center]', [
        	m('.info', m('span', card[set.item_key] + ':'), m('br'), card[set.back_key])
        ]) : m('.card-inner[horizontal][layout][center][center-justified]', [
        	m('div', card[set.item_key])
        ]),
        m('.button-row[horizontal][layout]', [
            m('a[flex]', {onclick: app.vm.next.bind(app.vm, card)}, 'No'),
            m('a[flex]', {onclick: app.vm.info.bind(app.vm, card)}, 'Info'),
            m('a[flex]', {onclick: app.vm.done.bind(app.vm, card)}, 'Yes')
        ])
    ]);
};

m.module(document.body, app);