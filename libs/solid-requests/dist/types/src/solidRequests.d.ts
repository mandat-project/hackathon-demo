import { AxiosResponse } from "axios";
import { Prefixes, Store } from "n3";
import { Session } from "@datev-research/mandat-shared-solid-oidc";
export interface ParsedN3 {
    store: Store;
    prefixes: Prefixes;
}
/**
 * Parse text/turtle to N3.
 * @param text text/turtle
 * @param baseIRI string
 * @return Promise ParsedN3
 */
export declare function parseToN3(text: string, baseIRI: string): Promise<ParsedN3>;
/**
 * Send a session.axiosFetch request: GET, uri, async requesting `text/turtle`
 *
 * @param uri: the URI of the text/turtle to get
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @param headers: OPTIONAL - headers to set manually (e.g. `Accept` or `baseIRI`), `content-type` is set by default to `text/turtle`.
 * @return Promise string of the response text/turtle
 */
export declare function getResource(uri: string, session?: Session, headers?: Record<string, string>): Promise<AxiosResponse<any, any>>;
/**
 * Send a session.axiosFetch request: POST, uri, async providing `text/turtle`
 * providing `text/turtle` and baseURI header, accepting `text/turtle`
 *
 * @param uri: the URI of the server (the text/turtle to post to)
 * @param body: OPTIONAL - the text/turtle to provide
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @param headers: OPTIONAL - headers to set manually (e.g. `Accept` or `baseIRI`), `content-type` is set by default to `text/turtle`.
 * @return Promise of the response
 */
export declare function postResource(uri: string, body?: string, session?: Session, headers?: Record<string, string>): Promise<AxiosResponse<any, any>>;
/**
 * Send a session.axiosFetch request: POST, location uri, container name, async .
 * This will generate a new URI at which the resource will be available.
 * The response's `Location` header will contain the URL of the created resource.
 *
 * @param uri: the URI of the resrouce to post to / to be located at
 * @param body: the body of the resource to create
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise Response
 */
export declare function createResource(locationURI: string, body: string, session?: Session, headers?: Record<string, string>): Promise<AxiosResponse<any, any>>;
/**
 * Send a session.axiosFetch request: POST, location uri, resource name, async .
 * If the container already exists, an additional one with a prefix will be created.
 * The response's `Location` header will contain the URL of the created resource.
 *
 * @param uri: the URI of the container to post to
 * @param name: the name of the container
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise Response (location header not included (i think) since you know the name and folder)
 */
export declare function createContainer(locationURI: string, name: string, session?: Session): Promise<AxiosResponse<any, any>>;
/**
 * Get the Location header of a newly created resource.
 * @param resp string location header
 */
export declare function getLocationHeader(resp: AxiosResponse<any, any>): string;
/**
 * Shortcut to get the items in a container.
 *
 * @param uri The container's URI to get the items from
 * @param session
 * @returns string URIs of the items in the container
 */
export declare function getContainerItems(uri: string, session: Session): Promise<string[]>;
/**
 * Send a session.axiosFetch request: PUT, uri, async providing `text/turtle`
 *
 * @param uri: the URI of the text/turtle to be put
 * @param body: the text/turtle to provide
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise string  of the created URI from the response `Location` header
 */
export declare function putResource(uri: string, body: string, session?: Session, headers?: Record<string, string>): Promise<AxiosResponse<any, any>>;
/**
 * Send a session.axiosFetch request: PATCH, uri, async providing `text/n3`
 *
 * @param uri: the URI of the text/n3 to be patch
 * @param body: the text/turtle to provide
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise string  of the created URI from the response `Location` header
 */
export declare function patchResource(uri: string, body: string, session?: Session): Promise<AxiosResponse<any, any>>;
/**
 * Send a session.axiosFetch request: DELETE, uri, async
 *
 * @param uri: the URI of the text/turtle to delete
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return true if http request successfull with status 204
 */
export declare function deleteResource(uri: string, session?: Session): Promise<boolean>;
/**
 * Send a session.axiosFetch request: HEAD, uri, header `Link` as json obj
 *
 * @param uri: the URI of the text/turtle to get the access control file for
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Json object of the Link header
 */
export declare function getLinkHeader(uri: string, session?: Session): Promise<Record<string, string[] | string>>;
export declare function getAclResourceUri(uri: string, session?: Session): Promise<string>;
