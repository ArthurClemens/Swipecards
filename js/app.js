'use strict';

// config values
var set;

var yes_icon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" width="24" height="24" viewBox="0 0 24.00 24.00" enable-background="new 0 0 24.00 24.00" xml:space="preserve"><path fill-opacity="1" stroke-width="0.2" stroke-linejoin="round" d="M 21,7L 9,19L 3.5,13.5L 4.91421,12.0858L 9,16.1716L 19.5858,5.58579L 21,7 Z "/></svg>';
var no_icon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" width="24" height="24" viewBox="0 0 24.00 24.00" enable-background="new 0 0 24.00 24.00" xml:space="preserve"><path fill-opacity="1" stroke-linejoin="round" d="M 19,6.41L 17.59,5L 12,10.59L 6.41,5L 5,6.41L 10.59,12L 5,17.59L 6.41,19L 12,13.41L 17.59,19L 19,17.59L 13.41,12L 19,6.41 Z "/></svg>';
var info_icon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" width="24" height="24" viewBox="0 0 24.00 24.00" enable-background="new 0 0 24.00 24.00" xml:space="preserve"><path fill-opacity="1" stroke-width="0.2" stroke-linejoin="round" d="M 10.9994,8.99805L 12.9994,8.99805L 12.9994,6.99805L 10.9994,6.99805M 11.9994,19.998C 7.58838,19.998 3.99939,16.4091 3.99939,11.998C 3.99939,7.58704 7.58838,3.99805 11.9994,3.99805C 16.4104,3.99805 19.9994,7.58704 19.9994,11.998C 19.9994,16.4091 16.4104,19.998 11.9994,19.998 Z M 11.9994,1.99805C 6.47638,1.99805 1.99939,6.47504 1.99939,11.998C 1.99939,17.5211 6.47638,21.998 11.9994,21.998C 17.5224,21.998 21.9994,17.5211 21.9994,11.998C 21.9994,6.47504 17.5224,1.99805 11.9994,1.99805 Z M 10.9994,16.998L 12.9994,16.998L 12.9994,10.998L 10.9994,10.998L 10.9994,16.998 Z "/></svg>';

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
    this.showInfo = m.prop(false);
};
app.vm.done = function(card) {
    card.done = true;
    app.vm.showInfo(false);
    app.storeData(app.vm.cards);
    app.vm.updateCardData();
};
app.vm.info = function() {
	app.vm.showInfo(!app.vm.showInfo());
};
app.vm.next = function() {
    app.vm.showInfo(false);
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
    if (card === undefined) {
        return m('.card[vertical][layout]', [
            m('.card-content[horizontal][layout][center][center-justified]', {class: 'card-done'}, 'Done!')
        ]);
    } else {
        return m('.card[vertical][layout]', [
            m('.control-row[horizontal][layout]', [
        		m('span[flex]', cardData.remaining.length),
        		m('span[flex]'),
        		m('span[flex]', (cardData.all.length - cardData.remaining.length))
            ]),
            m('.card-content[horizontal][layout][center][center-justified]',
            	app.vm.showInfo() ? m('.info', m('span', card[set.item_key]), m('br'), card[set.meaning_key]) : m('div', card[set.item_key])
            ),
            m('.card-buttons', 
                m('.buttons[horizontal][layout]', [
                    m('a[flex]', {onclick: app.vm.next.bind(app.vm)}, m.trust(no_icon)),
                    m('a[flex]', {onclick: app.vm.info.bind(app.vm)}, m.trust(info_icon)),
                    m('a[flex]', {onclick: app.vm.done.bind(app.vm, card)}, m.trust(yes_icon))
                ])
            )
        ]);
    }
};

m.module(document.body, app);