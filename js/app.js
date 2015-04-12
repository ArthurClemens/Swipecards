'use strict';

// config values
var set;

var yes_icon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" width="24" height="24" viewBox="0 0 24.00 24.00" enable-background="new 0 0 24.00 24.00" xml:space="preserve"><path fill-opacity="1" stroke-width="0.2" stroke-linejoin="round" d="M 21,7L 9,19L 3.5,13.5L 4.91421,12.0858L 9,16.1716L 19.5858,5.58579L 21,7 Z "/></svg>';
var no_icon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" width="24" height="24" viewBox="0 0 24.00 24.00" enable-background="new 0 0 24.00 24.00" xml:space="preserve"><path fill-opacity="1" stroke-linejoin="round" d="M 19,6.41L 17.59,5L 12,10.59L 6.41,5L 5,6.41L 10.59,12L 5,17.59L 6.41,19L 12,13.41L 17.59,19L 19,17.59L 13.41,12L 19,6.41 Z "/></svg>';
var info_icon = '<svg version="1.1" id="Layer_2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24" enable-background="new 0 0 24 24" xml:space="preserve"><g><polyline points="10.6,7.8 13.4,7.8 13.4,5 10.6,5   "/><rect x="10.6" y="10.601" width="2.801" height="8.399"/></g></svg>';

var chunkSize = 12;
var chunkMinSize = 4;

var app = {};

app.getCards = function() {
    m.startComputation();
    var deferred,
        stored,
        useStoredData,
        consolidateData;

    deferred = m.deferred();
    stored = localStorage.getItem(set.url);

    consolidateData = function(stored, fetchedData) {
        if (!stored) {
            return fetchedData;
        }
        var storedData = JSON.parse(stored);

        if (!storedData || storedData.length === 0) {
            return fetchedData;
        }

        // TODO: does not handle duplicate keys
        var consolidated = _.forEach(fetchedData, function(fetchedItem) {
            var storedMatch = _.find(storedData, function(storedItem) {
                return storedItem[set.item_key] == fetchedItem[set.item_key];
            });
            if (storedMatch) {
                fetchedItem.done = storedMatch.done;
            }
            return fetchedItem;
        });

        return consolidated;
    };

    useStoredData = function() {
        var data;
        if (stored) {
            data = JSON.parse(stored);
        } else {
            data = [];
        }
        deferred.resolve(data);
        m.endComputation();
    };

    // check if URL exists
    if (navigator.onLine) {
        Tabletop.init({
            key: set.url,
            callback: function(fetched) {
                var consolidated = consolidateData(stored, fetched);
                app.storeData(consolidated);
                deferred.resolve(consolidated);
                m.endComputation();
            },
            simpleSheet: true
        });
        /*
        m.request({
            method: 'GET',
            url: set.url,
            deserialize: function(value) {
                return value;
            }
        }).then(function() {
            Tabletop.init({
                key: set.url,
                callback: function(fetched) {
                    var consolidated = consolidateData(stored, fetched);
                    app.storeData(consolidated);
                    deferred.resolve(consolidated);
                    m.endComputation();
                },
                simpleSheet: true
            });
        }).then(null, function() {
            alert('Invalid URL');
            useStoredData();
        });
        */
    } else {
        useStoredData();
    }

    return deferred.promise;
};

app.storeData = function(data) {
    var self = this;
    self.data = data;
    if (self.timeout) {
        return;
    }
    self.timeout = setTimeout(function() {
        localStorage.setItem(set.url, JSON.stringify(self.data));
        self.timeout = undefined;
    }, 300);
};

app.clearData = function() {
    localStorage.removeItem(set.url);
};

app.vm = {};
app.vm.init = function() {
    //app.clearData();
    this.cards = m.prop(app.getCards());
    this.inited = m.prop(false);
    this.cardData = m.prop();
    this.chunks = m.prop();
    this.showInfo = m.prop(false);
};
app.vm.done = function(card) {
    card.done = true;
    app.vm.showInfo(false);
    app.storeData(app.vm.cards());
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
    var all,
        remaining,
        firstChunk,
        getCurrentChunkTodo,
        currentChunk,
        chunks,
        current;

    all = app.vm.cards();
    remaining = _.filter(all, function(c) {
        return c.done !== true;
    });
    if (app.vm.chunks() === undefined) {
        app.vm.chunks(_.chunk(_.shuffle(remaining), chunkSize));
    }

    firstChunk = _.first(app.vm.chunks());

    getCurrentChunkTodo = function() {
        return _.shuffle(_.filter(firstChunk, function(c) {
            return c.done !== true;
        }));
    };
    currentChunk = getCurrentChunkTodo();
    if (remaining.length === 0) {
        current = undefined;
    } else if (remaining.length === 1) {
        current = _.first(remaining);
    } else {
        if (currentChunk.length <= chunkMinSize && app.vm.chunks().length > 1) {
            chunks = app.vm.chunks().slice(1); // make copy from 1..n
            chunks[0] = chunks[0].concat(currentChunk); // add remainder
            app.vm.chunks(chunks);
            currentChunk = getCurrentChunkTodo();
        }
        current = _.first(currentChunk);
    }
    this.cardData({
        allCount: all.length,
        remainingCount: remaining.length,
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
        card = cardData.current,
        allCount = cardData.allCount,
        doneCount = cardData.allCount - cardData.remainingCount,
        donePercentage = 100.0 / allCount * doneCount;
    if (card === undefined) {
        return m('.card[vertical][layout]', [
            m('.card-content[horizontal][layout][center][center-justified]', {
                class: 'card-done'
            }, 'Done!')
        ]);
    } else {
        return m('.card[vertical][layout]', [
            m('.meta-row[horizontal][layout]', [
                m('span'),
                m('span[flex]', {
                    class: 'title'
                }, set.title)
            ]),
            m('.progress-row[horizontal][layout]',
                m('.done', {
                    style: 'width:' + donePercentage + '%'
                })
            ),
            m('.content-row[flex][horizontal][layout][center-center]',
                m('.card-content',
                    app.vm.showInfo() ? m('.info', m('span', card[set.item_key]), m('br'), card[set.meaning_key]) : m('div', card[set.item_key])
                )
            ),
            m('.card-buttons',
                m('.buttons[horizontal][layout]', [
                    m('a[flex]', {
                        onclick: app.vm.next.bind(app.vm)
                    }, m('.icon', m('i[fit]', m.trust(no_icon)))),
                    m('a[flex]', {
                        onclick: app.vm.info.bind(app.vm)
                    }, m('.icon', m('i[fit]', m.trust(info_icon)))),
                    m('a[flex]', {
                        onclick: app.vm.done.bind(app.vm, card)
                    }, m('.icon', m('i[fit]', m.trust(yes_icon))))
                ])
            )
        ]);
    }
};

m.module(document.body, app);