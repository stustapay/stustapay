---
sidebar_position: 5
---

# Making releases

First run the release script with `--dry-run` to see release version.

```shell
uv run tools/make_release.py --dry-run <major|minor|patch>
```

Then run the same command without `--dry-run` to bump all versions and make the release.
