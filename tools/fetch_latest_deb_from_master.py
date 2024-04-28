import argparse
import tempfile
import zipfile
from pathlib import Path

import requests

url = "https://api.github.com/repos/stustapay/stustapay/actions/artifacts?per_page=1&name=debs"


def main(output_dir: Path, access_token: str):
    resp = requests.get(url)
    data = resp.json()
    download_url = data["artifacts"][0]["archive_download_url"]
    print(f"Found artefact download url: {download_url}")

    with tempfile.TemporaryDirectory() as tmp_dir:
        zipfile_path = Path(tmp_dir) / "build.zip"

        resp = requests.get(download_url, headers={"Authorization": f"Bearer {access_token}"}, allow_redirects=True)
        with open(zipfile_path, "wb+") as f:
            f.write(resp.content)

        with zipfile.ZipFile(zipfile_path, "r") as zip_ref:
            deb_files = [z for z in zip_ref.namelist() if z.endswith(".deb")]
            for deb_file in deb_files:
                zip_ref.extract(deb_file, output_dir)
                print(f"Downloaded deb file to {output_dir / deb_file}")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("access_token", type=str)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    main(args.output_dir, args.access_token)
