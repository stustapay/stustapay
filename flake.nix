{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
    pyproject-nix = {
      url = "github:pyproject-nix/pyproject.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, pyproject-nix, uv2nix, pyproject-build-systems, ... }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs {
        inherit system;
      };

      lib = pkgs.lib;

      workspace = uv2nix.lib.workspace.loadWorkspace {
        workspaceRoot = ./.;
      };

      python = lib.head (pyproject-nix.lib.util.filterPythonInterpreters {
        inherit (workspace) requires-python;
        inherit (pkgs) pythonInterpreters;
      });

      pythonBase = pkgs.callPackage pyproject-nix.build.packages {
        inherit python;
      };

      overlay = workspace.mkPyprojectOverlay {
        sourcePreference = "wheel";
      };

      pythonSet = pythonBase.overrideScope (
        lib.composeManyExtensions [
          pyproject-build-systems.overlays.wheel
          overlay
        ]
      );

      virtualEnv = pythonSet.mkVirtualEnv "application-env" workspace.deps.default;
    in with pkgs; {
      packages.default = self.packages.${system}.stustapay;

      packages.stustapay-admin-ui = pkgs.buildNpmPackage {
        pname = "stustapay-admin-ui";
        version = "0.1.0";
        src = ./web;
        npmDepsHash = "sha256-W2bo8f6V2Jhm6FT3H4ndfhGzqMmu9Ugk3N01a/tLVl0=";
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
        npmDepsHash = "sha256-W2bo8f6V2Jhm6FT3H4ndfhGzqMmu9Ugk3N01a/tLVl0=";
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

      packages.stustapay = pkgs.stdenv.mkDerivation rec {
        name = "stustapay";
        buildInputs = with pkgs; [
          virtualEnv
          glib
          pango
          fontconfig
        ];
        nativeBuildInputs = [ pkgs.makeWrapper ];
        dontUnpack = true;
        installPhase = ''
          export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath buildInputs}:$LD_LIBRARY_PATH"
          mkdir -p $out/bin
          makeWrapper ${virtualEnv}/bin/stustapay $out/bin/stustapay --set LD_LIBRARY_PATH "$LD_LIBRARY_PATH"
        '';
      };

      devShell = mkShell {
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
