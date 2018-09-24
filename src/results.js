//const $rdf = require('../../../linkeddata/rdflib.js/dist/rdflib.min.js')
const $rdf = require('rdflib')

// @@ make them immutable instead of mutab;e? Creat enew ones each time?
// Array.flat is implemented in browsers but not in node!!

function arrayFlat(a) {
  let res = new Array()
  a.forEach(b => {
    if (Array.isArray(b)) {
      b.map(c => res.push(c))
    } else {
      res.push(b)
    }
  })
  return res
}
class ResultSet extends Array {

/** Make new result set
* @param {IndexedFormula} store - the store we will be querying
* @param {Node} subect - the store we will be querying
* @param {IndexedFormula} doc - the document whose data we will be querying, or null -> all documents
*/
  constructor (store, subject, doc) {
    super()
    this.store = store
    if (subject) {
      this.about(subject)
    }
    this.doc = doc
  }

  about (subject) {
    this.splice(0, undefined, subject)
    return this
  }
  accordingTo (doc) {
    this.document = doc
    return this
  }

  addPrefix (prefix, ns) {
    this.prefixes[prefix] = ns
    return this
  }

  setTo (array) {
    this.splice(0) // clear this
    array.forEach(x => this.push(x)) // @@ inefficient
  }
  /** Follow forward a property
  */
  has (predicate) {
    // console.log('length: ' + this.length)
    let aa = this.map(subject => this.store.each(subject, predicate, null, this.doc))
    // console.log('aa: length ' + aa.length)
    // console.log('aa.flat ' + aa.flat)
    this.setTo(arrayFlat(aa))
    return this
  }
  /** Follow back a property
  */

  isOf (predicate) {
    let aa = this.map(object => this.store.each(null, predicate, object, this.doc))
    this.setTo(arrayFlat(aa))
    return this
  }

  vals () { // don't conflict with Array.values()
    return this.map(x => x.value)
  }

  clone () {
    let twin = new ResultSet(this.store)
    twin.doc = this.doc
    twin.prefixes = [] // @@ copy
    twin.setTo(this)
    return twin
  }

  load () {
    if (!this.store.fetcher) {
      new $rdf.Fetcher(this.store)
    }
    return new Promise((resolve, reject) => {
      Promise.all(this.map(x => this.store.fetcher.load(x))).then(resolve(this))
    })
  }
  connectedStatements () {
    const kb = this.store
    return (arrayFlat(this.map(x => kb.connectedStatements(x))))
  }

  list () {
    return '[' + this.join(', ') + ']'
  }

} // class


// test it
const FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/')
const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')

const alice = $rdf.sym('https://example.com/alice/card#me')
const bob = $rdf.sym('https://example.com/bob/card#me')
const charlie = $rdf.sym('https://example.com/charlie/card#me')
const doc = alice.doc()

const store = new $rdf.IndexedFormula()
// const fetcher = new $rdf.Fetcher(store)

store.add(alice, FOAF('name'), "Alice", doc)
store.add(bob, FOAF('name'), "Bob", doc)
store.add(charlie, FOAF('name'), "Charlie", doc)

store.add(alice, FOAF('knows'), alice, doc)
store.add(alice, FOAF('knows'), bob, doc)
store.add(bob, FOAF('knows'), charlie, doc)
store.add(charlie, FOAF('knows'), alice, doc)


let a1 = new Array()
console.log('flat: ' + a1.flat)
var x = new ResultSet(store, alice)
x.has(FOAF('knows'))
console.log(' length ' + x.length)
console.log('join [' + x.join(', ') + ']')

var y1 = (new ResultSet(store, alice)).has(FOAF('knows')).has(FOAF('name'))
console.log('Alice friends names ' + y1.join(','))

var y3 = (new ResultSet(store, alice)).isOf(FOAF('knows')).has(FOAF('name'))
console.log('people who know alice names ' + y3.join(','))

var y2 = (new ResultSet(store, bob)).has(FOAF('knows')).has(FOAF('name'))
console.log('Bob friends names ' + y2.join(','))

var affn = (new ResultSet(store, alice)).has(FOAF('knows')).has(FOAF('knows')).has(FOAF('name'))
console.log('Alice friends friends names ' + affn.join(','))

//(new ResultSet(store, alice)).has(FOAF('knows')).has(FOAF('knows')).has(FOAF('name'))
console.log('Alice friends friends names ' + (new ResultSet(store, alice)).has(FOAF('knows')).has(FOAF('knows')).has(FOAF('name')).list())

console.log('AFFN length ' + affn.length)
console.log('AFFN [0] ' + affn[0])
affn.reverse()
console.log('Reversed: ' + affn.list())
affn.sort()
console.log('sorted: ' + affn.list())

$rdf.IndexedFormula.prototype.about = function (subject, doc) {
  return new ResultSet(this, subject, doc)
}

console.log('About: Alice friends friends names list ' + store.about(alice).has(FOAF('knows')).has(FOAF('knows')).has(FOAF('name')).list())
console.log('About: Alice friends friends names ' + store.about(alice).has(FOAF('knows')).has(FOAF('knows')).has(FOAF('name')))
console.log('About: Alice friends friends  list' + store.about(alice).has(FOAF('knows')).has(FOAF('knows')).list())
console.log('About: Alice friends friends ' + store.about(alice).has(FOAF('knows')).has(FOAF('knows')))
//console.log('About: Alice friends friends names ' + store.about(alice).has(FOAF('knows')).has(FOAF('knows')).has(FOAF('name')).list())

const tim = $rdf.sym('https://www.w3.org/People/Berners-Lee/card#i')
store.about(tim).load().then(rs => {
  console.log(rs.list())
  console.log('connectedStatements ' + rs.connectedStatements())
  let seeAlso = rs.clone().has(RDF('seeAlso'))
  console.log('seeAlso' + seeAlso)
  console.log('tim friend names' + rs.has(FOAF('knows')).has(FOAF('name')))
})


// ends
