#!/bin/env node

const pug = require('pug');
const fs = require('fs-extra');
const express = require('express');
const sha1 = require('sha1');

Object.assign(String.prototype, {
    toTitleCase() {
        return this
        .replace(/-/g, ' ')
        .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.substr(1));
    }
});

const buildMenu = () =>
    fs.readdir('./collections')
        .then((collections) => collections
            .filter((collection) => collection.charAt(0) !== '.')
            .map((collection) => { return {
                slug: collection,
                title: collection.toTitleCase()
            }})
        );

let port = parseInt(process.argv.pop(), 10);
if (isNaN(port)) {
    port = 8080;
}

let app = express();

const layout = pug.compileFile('./templates/layout.pug', {});

app.use(express.urlencoded());
app.use(express.static('./static/'));
app.use(express.static('./node_modules/bootstrap/dist/'));

app.get('/', (request, response) => {
    buildMenu()
        .then((collections) => ({collections: collections}))
        .then((data) => {
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(layout(data))
        });
});

app.post('/:collection/:section', (request, response) => {
    let collection = request.params.collection;
    let section = request.params.section;
    let itemNo = parseInt(request.body.itemNo, 10);
    fs.readJson('./collections/' + collection + '/' + section)
        .then((sectionData) => {
            sectionData[itemNo]._owned = !sectionData[itemNo]._owned;
            return fs.writeJson(
                './collections/' + collection + '/' + section,
                sectionData,
                {
                    spaces: 4
                }
            ).then(() => sectionData[itemNo]._owned);
        })
        .then((owned) => {
            if (request.xhr) {
                response.json({owned: owned});
            } else {
                response.redirect('/' + collection + '#' + sha1(section + '-' + itemNo));
            }
        });
});

app.get('/:collection', (request, response) => {
    buildMenu()
        .then((collections) => {
            let collection = request.params.collection;
            return fs.readdir('./collections/' + collection)
                .then((sections) => Promise
                    .all(sections
                        .filter((collection) => collection.charAt(0) !== '.')
                        .filter((section) => section.endsWith('.json'))
                        .map((section) => fs.readJson('./collections/' + collection + '/' + section))
                    )
                    .then((loadedSections) => ({
                        collections: collections,
                        sections: sections.reduce((obj, k, v) => ({
                            ...obj,
                            [k.replace(/^[0-9]+-|\.json$/g, '').toTitleCase()]: {
                                slug: k,
                                owned: loadedSections[v].reduce((a, c) => {
                                    let plus = c._owned ? 1 : 0;
                                    return a + plus;
                                }, 0),
                                items: loadedSections[v].map((item, i) => ({
                                    ...item,
                                    _anchor: sha1(k + '-' + i)
                                })),
                            }
                        }), {}),
                        collectionSlug: collection
                    }))
                );
        })
        .then((data) => {
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(layout(data))
        });
});

app.listen(port);
console.log('Server listening on port ' + port);