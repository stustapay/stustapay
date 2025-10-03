{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    nixpkgs-unstable.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, flake-utils, ... }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [];
      };
      pkgs-unstable = import nixpkgs-unstable {
        inherit system;
        overlays = [];
      };
    in with pkgs; {
      packages.default = self.packages.${system}.stustapay;

      packages.stustapay-admin-ui = pkgs.buildNpmPackage {
        pname = "stustapay-admin-ui";
        version = "0.1.0";
        src = ./web;
        npmDepsHash = "sha256-63i0RQYYwghVzGmrc8+9UAyrYII5eWlUCA3gsH92ZMo=";
        npmInstallFlags = "--verbose";
        dontNpmBuild = true;
        buildPhase = ''
          ${pkgs.util-linux}/bin/script -c "npx nx --verbose build administration" /dev/null
        '';
        dontNpmInstall = true;
        installPhase = ''
          mkdir -p $out
          mv dist/apps/administration/* $out/.
        '';
        CYPRESS_INSTALL_BINARY = 0;
        CYPRESS_RUN_BINARY = "${pkgs.cypress}/bin/Cypress";
      };

      packages.stustapay-customer-ui = pkgs.buildNpmPackage {
        pname = "stustapay-customer-ui";
        version = "0.1.0";
        src = ./web;
        npmDepsHash = "sha256-63i0RQYYwghVzGmrc8+9UAyrYII5eWlUCA3gsH92ZMo=";
        npmInstallFlags = "--verbose";
        dontNpmBuild = true;
        buildPhase = ''
          ${pkgs.util-linux}/bin/script -c "npx nx --verbose build customerportal" /dev/null
        '';
        dontNpmInstall = true;
        installPhase = ''
          mkdir -p $out
          mv dist/apps/customerportal/* $out/.
        '';
        CYPRESS_INSTALL_BINARY = 0;
        CYPRESS_RUN_BINARY = "${pkgs.cypress}/bin/Cypress";
      };

      packages.stustapay = let
        python = pkgs-unstable.python3.override {
          self = python;
          packageOverrides = final: prev: {
            sftkit = final.buildPythonPackage rec {
              pname = "sftkit";
              version = "0.2.0";
              src = fetchPypi {
                inherit pname version;
                hash = "sha256-7Mx634ZiQyiC6bJ/Yiks671XiDS+++4YYqjz9QigdY4=";
              };
              pyproject = true;
              doCheck = false;
              build-system = with final; [
                pdm-backend
              ];
              dependencies = with final; [
                fastapi
                typer
                uvicorn
                asyncpg
                pydantic
              ];
              pythonRelaxDeps = [ "pydantic" ];
            };
          };
        };
      in with python.pkgs; buildPythonPackage {
        pname = "stustapay";
        version = "0.1.0";
        src = ./.;
        pyproject = true;
        build-system = [
          setuptools
        ];
        dependencies = [
          fastapi
          typer
          uvicorn
          asyncpg
          pydantic
          python-jose
          jinja2
          aiohttp
          pylatexenc
          schwifty
          sepaxml
          asn1crypto
          ecdsa
          dateutils
          aiosmtplib
          bcrypt
          passlib
          pyyaml
          email-validator
          python-multipart
          pkgs.texlive.combined.scheme-full
        ];
        pythonRelaxDeps = [
          "jinja2"
          "aiohttp"
          "schwifty"
          "ecdsa"
          "aiosmtplib"
          "bcrypt"
          "pyyaml"
          "fastapi"
          "typer"
          "uvicorn"
          "pydantic"
          "python-multipart"
          "passlib"
          "asyncpg"
          "python-jose"
          "sepaxml"
        ];
      };

      devShell = mkShell rec {
        buildInputs = [
          (python3.withPackages(ps: with ps; [
            pip
          ]))
          nodejs
          typst
        ];
      };
    }
  );
}
