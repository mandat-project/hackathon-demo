# Solid OIDC Client Browser - MANDAT Edition

This library implements a very simple version of the Solid OIDC protocol:

- [x] AuthorizationCodeGrant
- [x] with PKCE
- [x] with `iss` check (TODO double check if token check necessary)
- [x] with dynamic client registration (TODO support provided `client_id` and client profile documents)
- [x] RefreshTokenGrant to renew a session
- [ ] Unsure about storage. Currently, `client_id`, `client_secret`, `refresh_token` and `token_endpoint` are stored in `sessionStorage`. I see that other implementations store the session state in `localStorage` - no idea if that is deemed secure nowadays.

Co-authored by @dschraudner and @uvdsl.
