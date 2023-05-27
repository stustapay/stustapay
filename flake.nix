{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [
          (final: prev: {
            python3 = prev.python3.override {
              packageOverrides = pfinal: pprev: {
                fastapi = pprev.fastapi.overrideAttrs (a: rec {
                  version = "0.95.0";
                  src = prev.fetchFromGitHub {
                    owner = "tiangolo";
                    repo = a.pname;
                    rev = "refs/tags/0.95.0";
                    hash = "sha256-raZNiZYNOGDGvZtTMGvxgTslmcMlwuVXh8mfof1NhHs=";
                  };
                });
                starlette = pprev.starlette.overrideAttrs (a: rec {
                  version = "0.26.1";
                  src = prev.fetchFromGitHub {
                    owner = "encode";
                    repo = a.pname;
                    rev = "refs/tags/0.26.1";
                    hash = "sha256-/zYqYmmCcOLU8Di9b4BzDLFtB5wYEEF1bYN6u2rb8Lg=";
                  };
                  postPatch = "";
                });
              };
            };
          })
        ];
      };
    in with pkgs; {
      devShell = mkShell rec {
        buildInputs = [
          (python3.withPackages(ps: with ps; [
            fastapi
            python-multipart
            uvicorn
            pydantic
            passlib
            asyncpg
            pyyaml
            python-jose
            jinja2
            aiohttp
            pylatexenc
            schwifty
            sepaxml
          ]))
          nodejs
        ];
      };

      packages.default = mkDerivation {};
    }
  );
}
