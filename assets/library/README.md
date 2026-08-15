# A Cup of Compassion digital library

This directory contains the complete app library: six books and two companion workbooks, each shipped as PDF and EPUB.

The book PDFs use their production 6.25 x 10 inch fixed layouts. The workbooks use US Letter pages for practical home printing. The EPUB editions are reflowable for e-readers and phones.

## Integrity check

The PDF and EPUB files are committed as ordinary Git binary objects, not text previews or Git LFS pointers. GitHub can omit binary diff previews for large files; that does not truncate the committed downloads.

After cloning, verify all sixteen publication files with:

```sh
cd assets/library
sha256sum -c SHA256SUMS.txt
```

`catalog.json` provides the same hashes, byte counts, and public app paths for deployment checks.
