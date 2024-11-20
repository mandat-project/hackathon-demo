import {ACL, CREDIT, GDPRP, INTEROP, LDP, RDFS, SCHEMA, SKOS, XSD} from '@shared/solid';

const prefix =`@prefix interop: <${INTEROP()}> .
    @prefix ldp: <${LDP()}> .
    @prefix skos: <${SKOS()}> .
    @prefix credit: <${CREDIT()}> .
    @prefix xsd: <${XSD()}> .
    @prefix acl: <${ACL()}> .
    @prefix gdprp: <${GDPRP()}> .
    @prefix rdfs: <${RDFS()}> .
`;

export const getDataBody = (demandUri: string,demanderUri:  string, selectedShapeTreeValue: string, memberOfValue:string) => {
    console.log("** memberValueOf fromSolid **", memberOfValue);

    return prefix + `

    # This could be hosted at the profle document of the application or social agent or at a
    # central location (e.g. together with the shapes/shapetress) for "standardized" access needs
    <#bwaAccessNeed>
      a interop:AccessNeed ;
      interop:accessMode acl:Read ;
      interop:registeredShapeTree <${selectedShapeTreeValue}> ;
      interop:accessNecessity interop:accessRequired .

    <#bwaAccessNeedGroup>
      a interop:AccessNeedGroup ;
      interop:hasAccessDescriptionSet <#bwaAccessDescriptionSet> ;
      interop:accessNecessity interop:accessRequired ;
      interop:accessScenario interop:sharedAccess ;
      interop:authenticatesAs interop:SocialAgent ;
      interop:hasAccessNeed <#bwaAccessNeed> .

    <#bwaAccessDescriptionSet>
      a interop:AccessDescriptionSet ;
      interop:usesLanguage "de"^^xsd:language .

    # This is hosted at the profile document of the agent or application
    <#bwaAccessNeedGroupDescription>
      a interop:AccessNeedGroupDescription ;
      interop:inAccessDescriptionSet <#bwaAccessDescriptionSet> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;
      skos:prefLabel "Access business analyses (Group)"@en ;
      skos:definition "The bank needs to know your business analyses in order to prepare a suitable loan offer for you"@en .

    <#bwaAccessNeedDescription>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#bwaAccessDescriptionSet> ;
      interop:hasAccessNeed <#bwaAccessNeed> ;
      skos:prefLabel "Access business analyses"@en ;
      skos:definition "The bank needs to know your business analyses in order to prepare a suitable loan offer for you"@en .

    # Goes into the access inbox of sme
    <#bwaAccessRequest>
      a interop:AccessRequest ;
      gdprp:purposeForProcessing gdprp:contractualObligations ;
      interop:fromSocialAgent <${memberOfValue}> ;
      interop:toSocialAgent  <${demanderUri}> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;

      rdfs:seeAlso <${demandUri}>.
`;
    }


export const getAccessBeingSetBody = (memberOf:string, forAgent:string, demandUri:string, resource:string) =>{
    return prefix + `

    <#accessRequest>
      a interop:AccessRequest ;
      gdprp:purposeForProcessing gdprp:contractualObligations ;
      interop:fromSocialAgent <${memberOf}> ;
      interop:toSocialAgent  <${memberOf}> ;
      interop:forSocialAgent <${forAgent}> ;
      interop:hasAccessNeedGroup <#accessNeedGroup> ;
      rdfs:seeAlso <${demandUri}>.

    <#accessNeedGroupDescription>
      a interop:AccessNeedGroupDescription ;
      interop:inAccessDescriptionSet <#accessDescriptionSet> ;
      interop:hasAccessNeedGroup <#accessNeedGroup> ;
      skos:prefLabel "Zugriff Offer und Order container"@de ;
      skos:definition "Gib das Angebot frei."@de .

    <#accessNeedGroup>
      a interop:AccessNeedGroup ;
      interop:hasAccessDescriptionSet <#accessDescriptionSet> ;
      interop:accessNecessity interop:accessRequired ;
      interop:accessScenario interop:sharedAccess ;
      interop:authenticatesAs interop:SocialAgent ;
      interop:hasAccessNeed <#accessNeed>, <#accessNeed2> .

    <#accessNeedDescription>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#accessNeedGroupDescription> ;
      interop:hasAccessNeed <#accessNeed> ;
      skos:prefLabel "Zugriff Offer"@de ;
      skos:definition "Gib das Angebot frei."@de .

    <#accessNeed>
      a interop:AccessNeed ;
      interop:accessMode acl:Read ;
      interop:registeredShapeTree <https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOfferTree> ;
      interop:hasDataInstance <${resource}> ;
      interop:accessNecessity interop:accessRequired .

    <#accessNeedDescription2>
      a interop:AccessNeedDescription ;
      interop:inAccessDescriptionSet <#accessNeedGroupDescription> ;
      interop:hasAccessNeed <#accessNeed2> ;
      skos:prefLabel "Zugriff Order"@de ;
      skos:definition "Gib den Order Container frei."@de .

    <#accessNeed2>
      a interop:AccessNeed ;
      interop:accessMode acl:Append ;
      interop:registeredShapeTree <https://solid.aifb.kit.edu/shapes/mandat/credit.tree#creditOrderTree> ;
      interop:accessNecessity interop:accessRequired .

    <#accessDescriptionSet>
      a interop:AccessDescriptionSet ;
      interop:usesLanguage "de"^^xsd:language .`;
}

export const getDocumentCreationDemandBody = (memberOf:string, demandUri:string, selectedShapeTree: string) => {
    return `\
      @prefix schema: <${SCHEMA()}> .
      @prefix credit: <${CREDIT()}> .
      @prefix interop: <${INTEROP()}> .
      <> a schema:Demand ;
      interop:fromSocialAgent <${memberOf}> ;
      credit:derivedFromDemand <${demandUri}> ;
      interop:registeredShapeTree <${selectedShapeTree}> .
      <${memberOf}> schema:seeks <> .
    `;
}

export const getCreateOfferResourceBody = (
    demand: string,
    derivedFromData: string[],
    dataAccessRequest: string,
    memberOf: string,
    demanderUri: string,
    amount: string,
    currency: string,
    annualPercentageRate: string,
    selectedLongTerm: string) => {
    return `
          @prefix : <#>.
          @prefix credit: <${CREDIT()}> .
          @prefix schema: <${SCHEMA()}> .
          <> a credit:Offer;
            schema:itemOffered <#credit>;
            schema:availability schema:InStock;
            credit:derivedFromDemand <${demand}> ;
            credit:derivedFromData ${derivedFromData} ;
            credit:hasUnderlyingRequest <${dataAccessRequest}> .
          <${memberOf}> schema:offers <>  .
          <${demanderUri}> schema:seeks <>  .
          <#credit>
                  a schema:LoanOrCredit ;
                  schema:amount "${amount}";
                  schema:currency "${currency}";
                  schema:annualPercentageRate "${annualPercentageRate}";
                  schema:loanTerm <#duration>.
            <#duration>
              a schema:QuantitativeValue;
              schema:value "${selectedLongTerm} years".
            `;
}