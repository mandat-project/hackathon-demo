"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHAPETREE = exports.AD = exports.MANDAT = exports.ORG = exports.SKOS = exports.INTEROP = exports.SCHEMA = exports.CREDIT = exports.SVCS = exports.SPACE = exports.SEC = exports.PUSH = exports.GDPRP = exports.VCARD = exports.WILD = exports.LDCV = exports.PDGR = exports.ETHON = exports.XSD = exports.AS = exports.AUTH = exports.ACL = exports.LDP = exports.WD = exports.WDT = exports.RDFS = exports.RDF = exports.DCT = exports.FOAF = void 0;
/**
 * Concat the RDF namespace identified by the prefix used as function name
 * with the RDF thing identifier as function parameter,
 * e.g. FOAF("knows") resovles to "http://xmlns.com/foaf/0.1/knows"
 * @param namespace uri of the namesapce
 * @returns function which takes a parameter of RDF thing identifier as string
 */
function Namespace(namespace) {
    return (thing) => thing ? namespace.concat(thing) : namespace;
}
// Namespaces as functions where their parameter is the RDF thing identifier => concat, e.g. FOAF("knows") resolves to "http://xmlns.com/foaf/0.1/knows"
exports.FOAF = Namespace("http://xmlns.com/foaf/0.1/");
exports.DCT = Namespace("http://purl.org/dc/terms/");
exports.RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
exports.RDFS = Namespace("http://www.w3.org/2000/01/rdf-schema#");
exports.WDT = Namespace("http://www.wikidata.org/prop/direct/");
exports.WD = Namespace("http://www.wikidata.org/entity/");
exports.LDP = Namespace("http://www.w3.org/ns/ldp#");
exports.ACL = Namespace("http://www.w3.org/ns/auth/acl#");
exports.AUTH = Namespace("http://www.example.org/vocab/datev/auth#");
exports.AS = Namespace("https://www.w3.org/ns/activitystreams#");
exports.XSD = Namespace("http://www.w3.org/2001/XMLSchema#");
exports.ETHON = Namespace("http://ethon.consensys.net/");
exports.PDGR = Namespace("http://purl.org/pedigree#");
exports.LDCV = Namespace("http://people.aifb.kit.edu/co1683/2019/ld-chain/vocab#");
exports.WILD = Namespace("http://purl.org/wild/vocab#");
exports.VCARD = Namespace("http://www.w3.org/2006/vcard/ns#");
exports.GDPRP = Namespace("https://solid.ti.rw.fau.de/public/ns/gdpr-purposes#");
exports.PUSH = Namespace("https://purl.org/solid-web-push/vocab#");
exports.SEC = Namespace("https://w3id.org/security#");
exports.SPACE = Namespace("http://www.w3.org/ns/pim/space#");
exports.SVCS = Namespace("https://purl.org/solid-vc/credentialStatus#");
exports.CREDIT = Namespace("http://example.org/vocab/datev/credit#");
exports.SCHEMA = Namespace("http://schema.org/");
exports.INTEROP = Namespace("http://www.w3.org/ns/solid/interop#");
exports.SKOS = Namespace("http://www.w3.org/2004/02/skos/core#");
exports.ORG = Namespace("http://www.w3.org/ns/org#");
exports.MANDAT = Namespace("https://solid.aifb.kit.edu/vocab/mandat/");
exports.AD = Namespace("https://www.example.org/advertisement/");
exports.SHAPETREE = Namespace("https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#");
