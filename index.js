'use strict';

var keys = require('object-keys');
var difference = require('lodash.difference');
var nlcstToString = require('nlcst-to-string');
var quotation = require('quotation');
var search = require('nlcst-search');
var position = require('unist-util-position');
var merge = require('deepmerge');

var rules = [
  require('./rules/brands.json'),
  require('./rules/forbidden.json'),
  require('./rules/government-words.json'),
  require('./rules/18f-style.json')
];

var patterns = merge.all(rules);

module.exports = simplify;

var list = keys(patterns);

function simplify(options) {
  var ignore = (options || {}).ignore || [];

  var phrases = difference(list, ignore);

  return transformer;

  function transformer(tree, file) {

    search(tree, phrases, finder);

    function casedMatch(match, replace) {
      return replace.indexOf(match) > -1;
    }

    function finder(match, index, parent, phrase) {

      var pattern = patterns[phrase];
      var replace = pattern.replace;
      var astMatch = nlcstToString(match)
      var value = quotation(astMatch, '“', '”');
      var reason;
      var message;

      var cased = casedMatch(astMatch, replace)


      if (pattern.omit && replace.length === 0) {
        reason = 'Remove ' + value;
      } else {
        reason = 'Replace ' + value + ' with ' + quotation(replace, '“', '”').join(', ');

        if (pattern.omit) {
          reason += ', or remove it';
        }
      }

      if ((pattern.cased && !cased) || pattern.omit || !pattern.cased) {
        message = file.warn(reason, {
          start: position.start(match[0]),
          end: position.end(match[match.length - 1])
        });

        message.ruleId = phrase.replace(/\s+/g, '-').toLowerCase();
        message.source = 'retext-simplify';
      }
    }
  }
}
