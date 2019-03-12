#!/bin/env node

const pug = require('pug');
const fs = require('fs-extra');
const express = require('express');
const sha1 = require('sha1');
const path = require('path');

const appDir = path.dirname(path.resolve(process.argv[1]));
const contentDir = path.resolve(process.argv[2]);
let port = parseInt(process.argv.pop(), 10);
if (isNaN(port)) {
    port = 8080;
}
const pugOptions = {
    basedir: path.join(appDir, 'templates')
};

Object.assign(String.prototype, {
    toTitleCase() {
        return this
        .replace(/-/g, ' ')
        .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.substr(1));
    }
});

const buildMenu = () =>
    fs.readdir(contentDir)
        .then((collections) => collections
            .filter((collection) => collection.charAt(0) !== '.')
            .map((collection) => { return {
                slug: collection,
                title: collection.toTitleCase()
            }})
        );

let app = express();

const defaultTemplate = pug.compileFile(path.join(pugOptions.basedir, 'layout.pug'), pugOptions);

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(appDir, 'static')));
app.use(express.static(path.join(appDir, 'node_modules/bootstrap/dist')));

app.get('/', (request, response) => {
    buildMenu()
        .then((collections) => ({collections: collections}))
        .then((data) => {
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(defaultTemplate(data))
        });
});

app.post('/:collection/:section', (request, response) => {
    let collection = request.params.collection;
    let section = request.params.section;
    let itemNo = parseInt(request.body.itemNo, 10);
    fs.readJson(path.join(contentDir, collection, section))
        .then((sectionData) => {
            sectionData[itemNo]._owned = !sectionData[itemNo]._owned;
            return fs.writeJson(
                path.join(contentDir, collection, section),
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
            return fs.readdir(path.join(contentDir, collection))
                .then((sections) => sections
                    .filter((section) => section.charAt(0) !== '.')
                    .filter((section) => section.endsWith('.json'))
                )
                .then((sections) => Promise
                    .all(sections
                        .map((section) => fs.readJson(path.join(contentDir, collection, section)))
                    )
                    .then((loadedSections) => (
                        {
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
                    }
                    ))
                    .then((variables) => fs.exists(path.join(contentDir, collection, 'template.pug'))
                            .then((exists) => ({
                                variables: variables,
                                template: exists ? pug.compileFile(path.join(contentDir, collection, 'template.pug'), pugOptions) : defaultTemplate
                            }))
                    )
                )
        })
        .then((data) => {
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(data.template(data.variables));
        })
        .catch((e) => {
            response.json(e);
        });
});

app.listen(port);
console.log('Server listening on port ' + port + ', providing from ' + contentDir);