import { getHelpContent } from "./content";

describe("help content locales", () => {
  test("returns German content for German locales", () => {
    const content = getHelpContent("de-DE");

    expect(content.sections[0].title).toBe("Einstieg und Navigation");
    expect(content.sections[0].links[0].label).toBe("Profil öffnen");
  });

  test("returns English content for non-German locales", () => {
    const content = getHelpContent("en-US");

    expect(content.sections[0].title).toBe("Getting started and navigation");
    expect(content.sections[0].links[0].label).toBe("Open profile");
  });
});
