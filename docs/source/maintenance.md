# Maintainer tasks

This document includes instructions for typical maintainer tasks.

## Build a package

To build a source tarball in `dist/`, run the following:

```bash
make sdist
```

## Make a release

To start a new major/minor branch for its first release (e.g., 0.3.0):

```bash
git checkout master
git pull origin master
git checkout -b 0.3.x

git checkout master

# edit _version.py to bump to next major/minor (e.g., 0.4.0.dev)
# then ...

git add .
git commit -m 'Bump to 0.4.0.dev'
git push origin master
```

To make a patch release on a major/minor branch (e.g., 0.3.0):

```bash
# cherry-pick commits into the branch from master
# if there's multiple comments on master, do this ...
git checkout master
git checkout -b tmp-backport-0.3.x
git rebase -i 0.3.x
# delete any version bumps or other commits you don't want
# in the stable release branch from master
git checkout 0.3.x
git merge tmp-backport-0.3.x
git branch -D tmp-backport-0.3.x

# if there's only one or two commits, just use cherry-pick
# then ...
git checkout -b 0.3.x

# edit _version.py to remove the trailing 'dev' token
# then ...

git add .
git commit -m 'Release 0.3.0'
git tag 0.3.0

# do the release
make release

# edit _version.py to bump to 0.3.1.dev
# then ...

git add .
git commit -m 'Bump to 0.3.1.dev'

git push origin 0.3.x
git push origin 0.3.0
```
