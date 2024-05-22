{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [];
      };
    in with pkgs; {
      devShell = mkShell rec {
        buildInputs = [
          (python3.withPackages(ps: with ps; [
            pip
          ]))
          nodejs
          typst
        ];
      };

      packages.default = mkDerivation {};
    }
  );
}
