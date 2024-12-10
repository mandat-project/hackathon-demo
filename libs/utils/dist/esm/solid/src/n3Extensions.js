import { BlankNode, Quad, Store, Writer, } from "n3";
import { RDF } from "./namespaces";
/**
 * Generate the canonical string form of a node.
 * @param term n3 term
 * @return string
 */
export function canonicaliseTerm(term) {
    switch (term.termType) {
        case "NamedNode":
            return `<${term.value}>`;
        case "BlankNode":
            return `_:${term.value}`;
        case "Literal":
            return `"${term.value}"^^<${term.datatypeString}>`;
        default: // e.g. SerialisedTerm
            return term.value;
    }
}
/**
 * From an array, remove all occurences of values that occur more than twice, e.g. [1,2,3,3] => [1,2]
 * @param arr
 * @returns
 */
const _removeDoubles = (arr) => {
    let arrVals = arr.map((term) => term.value);
    arrVals = arrVals.filter((item) => arrVals.lastIndexOf(item) == arrVals.indexOf(item));
    return arr.filter((term) => arrVals.includes(term.value));
};
/**
 * Find lists in an n3 store. Beginning by all rdf:nil, work upstream to retrieve all list items.
 * @param n3Store
 * @returns mapping { head of list : [items, correspondingQuads] }
 */
const _findLists = (n3Store) => {
    const listMapping = {};
    const endOfLists = n3Store.getQuads(null, RDF("rest"), RDF("nil"), null);
    endOfLists.forEach((quad) => {
        let items = [];
        let quads = [];
        let itemQuads = [];
        let prevQuads = [quad];
        let currentBN = "";
        while (prevQuads.length !== 0) {
            quads = prevQuads.concat(quads);
            const currentQuad = prevQuads[0];
            currentBN = currentQuad.subject.value;
            // get upstream list items
            itemQuads = n3Store.getQuads(currentQuad.subject, RDF("first"), null, null);
            quads = itemQuads.concat(quads);
            items = itemQuads.map((quad) => quad.object).concat(items);
            prevQuads = n3Store.getQuads(null, RDF("rest"), currentQuad.subject, null);
            // end when no prior item
        }
        listMapping[`${currentBN}`] = [items, quads];
    });
    return listMapping;
};
const _serialiseList = (terms, listMapping, blankNodes, n3Store, n3Writer) => {
    for (const [i, term] of terms.entries()) {
        if (term.termType === "BlankNode") {
            if (Object.keys(listMapping).includes(term.value)) { // list
                const listTerms = listMapping[term.value][0];
                console.log(listMapping);
                const serialisation = ` ( ${_serialiseList(listTerms, listMapping, blankNodes, n3Store, n3Writer).map(canonicaliseTerm).join(" ")} ) `;
                terms[i] = { id: serialisation, value: serialisation };
            }
            else { // blank node
                if (blankNodes.includes(term)) {
                    terms[i] = _serialiseBlankNode(term, blankNodes, listMapping, n3Store, n3Writer);
                }
            }
        }
    }
    return terms;
};
const _serialiseBlankNode = (bn, blankNodes, listMapping, n3Store, n3Writer) => {
    const bquads = n3Store.getQuads(bn, null, null, null);
    const bquads_serial = bquads.map((bquad) => {
        let obj = bquad.object;
        if (obj.termType === "BlankNode") {
            if (Object.keys(listMapping).includes(obj.value)) { // list
                const listTerms = listMapping[obj.value][0];
                const serialisation = ` ( ${_serialiseList(listTerms, listMapping, blankNodes, n3Store, n3Writer).map(canonicaliseTerm).join(" ")} ) `;
                obj = { id: serialisation, value: serialisation };
            }
            else // blank node
             if (blankNodes.includes(bn)) {
                obj = _serialiseBlankNode(obj, blankNodes, listMapping, n3Store, n3Writer);
            }
        }
        return new Quad(bquad.subject, bquad.predicate, obj, bquad.graph);
    });
    const battr = [];
    bquads_serial.forEach(bquad => {
        battr.push({ predicate: bquad.predicate, object: bquad.object });
    });
    n3Store.removeQuads(bquads);
    return n3Writer.blank(battr);
};
/**
 * Prints the turtle rdf format.
 *
 * @param n3Store
 * @param n3Prefixes
 * @param baseIRI
 * @returns string
 */
export const toTTL = (n3Store, n3Prefixes, baseIRI) => {
    n3Store = new Store(n3Store.getQuads(null, null, null, null));
    let result = "";
    const n3Writer = new Writer({
        baseIRI: baseIRI,
        prefixes: n3Prefixes,
    });
    // find lists
    const listMapping = _findLists(n3Store);
    Object.entries(listMapping).forEach(entry => {
        // uniquely referenced list head
        if (n3Store.countQuads(null, null, new BlankNode(entry[0]), null) !== 1) {
            delete listMapping[entry[0]]; // remove non unique list, or  dangling list from mapping
        }
    });
    // find blank nodes in lists
    const visitedBlankNodes = [];
    Object.entries(listMapping).forEach((entry) => {
        n3Store.removeQuads(entry[1][1]); // remove quads since we will do manual serialisation
        entry[1][0].forEach((term) => {
            if (term.termType === "BlankNode")
                visitedBlankNodes.push(term);
        });
    });
    // find uniquely referenced blank nodes
    let blankNodes = [];
    n3Store.getObjects(null, null, null).forEach((obj) => {
        if (obj.termType == "BlankNode") {
            // if that is already visited during list search, we have a double.
            if (!visitedBlankNodes.map((term) => term.value).includes(obj.value)) { // if not, unique?
                if (n3Store.countQuads(null, null, obj, null) == 1) { // unique!
                    blankNodes.push(obj);
                }
            }
            else { // visited, add for later easy removal of doubles
                visitedBlankNodes.push(obj);
            }
        }
    });
    // array of uniquely referenced blank nodes in graph
    blankNodes = blankNodes.concat(_removeDoubles(visitedBlankNodes));
    // serialise lists
    const serialisedLists = {};
    Object.entries(listMapping).forEach(entry => {
        // uniquely referenced list head
        serialisedLists[entry[0]] = _serialiseList(entry[1][0], listMapping, blankNodes, n3Store, n3Writer); // create list serialisation
    });
    // serialise blank nodes
    const serialisedBlankNodes = {};
    blankNodes.forEach(bn => {
        serialisedBlankNodes[bn.value] = _serialiseBlankNode(bn, blankNodes, listMapping, n3Store, n3Writer);
    });
    // // write
    n3Store.getQuads(null, null, null, null).forEach((quad) => {
        if (quad.object.value in serialisedLists) {
            n3Writer.addQuad(quad.subject, quad.predicate, n3Writer.list(serialisedLists[quad.object.value]));
        }
        else if (quad.object.value in serialisedBlankNodes) {
            n3Writer.addQuad(quad.subject, quad.predicate, serialisedBlankNodes[quad.object.value]);
        }
        else {
            n3Writer.addQuad(quad);
        }
    });
    // n3Writer.addQuads(n3Store.getQuads(null, null, null, null))
    n3Writer.end((error, text) => (result = text));
    // return `# Parsed from underlying RDF graph.\n ${result}`;
    return result;
};
/*
  export function getListItems(n3Store, baseIRI) {
    let node = n3Store
      .getQuads(baseIRI, AS("items"), null, null)
      .map((quad) => quad.object)[0];

    let result = [];

    while (node.value !== RDF("nil")) {
      result.push(
        n3Store
          .getQuads(node, RDF("first"), null, null)
          .map((quad) => quad.object)
      );
      node = n3Store
        .getQuads(node, RDF("rest"), null, null)
        .map((quad) => quad.object)[0];
    }

    return result.flat();
  }

  */
