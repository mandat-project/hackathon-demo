import { Prefixes, Store, Term } from "n3";
/**
 * Generate the canonical string form of a node.
 * @param term n3 term
 * @return string
 */
export declare function canonicaliseTerm(term: Term): string;
/**
 * Prints the turtle rdf format.
 *
 * @param n3Store
 * @param n3Prefixes
 * @param baseIRI
 * @returns string
 */
export declare const toTTL: (n3Store: Store, n3Prefixes?: Prefixes, baseIRI?: string) => string;
