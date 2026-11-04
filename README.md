# Canonical Email

[![CI](https://github.com/sjp/canonical-email/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/sjp/canonical-email/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/sjp/canonical-email)](LICENSE)

Find the canonical form of an email address based on the mail provider's addressing rules.

**Live site:** https://sjp.github.io/canonical-email/

The app looks up the domain's MX records (via Google Public DNS) to identify the mailbox provider, then applies that provider's rules, such as stripping `+tag` / `-tag` suffixes or ignoring dots in the local part. For example, `J.Doe+news@gmail.com` becomes `jdoe@gmail.com`.

Supported providers: Apple, Fastmail, GMX, Google, Mail.com, Microsoft, Proton Mail, Rackspace, Yahoo, Yandex and Zoho.

## Development

```sh
npm install
npm run dev       # start the dev server
npm test          # run tests
npm run check     # format check + lint
npm run build     # production build to dist/
```

These work out of the box via a provided devcontainer.

## License

[MIT](LICENSE)
