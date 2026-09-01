import { choosePacing, violatesConversationalRestraint } from "./pacing";

describe("choosePacing", () => {
  test("holds on long narratives", () => {
    const input = Array.from({ length: 100 }, () => "palavra").join(" ");
    expect(choosePacing({ history: [], input }).state).toBe("holding");
  });

  test("deepens on recalled material", () => {
    expect(choosePacing({ history: [], input: "Quando eu era criança, lembro disso." }).state).toBe("deepening");
  });

  test("follows a clear pivot", () => {
    expect(choosePacing({ history: [{ role: "assistant", content: "Falávamos do trabalho." }], input: "Aliás, outra coisa: vou viajar." }).state).toBe("pivoting");
  });

  test("detects contrast for juxtaposition", () => {
    expect(choosePacing({ history: [], input: "Eu quero sair, mas também tenho medo." }).state).toBe("juxtaposing");
  });
});

describe("violatesConversationalRestraint", () => {
  test("rejects generic opener", () => {
    expect(violatesConversationalRestraint("Entendi. Me conte mais.")).toBe(true);
  });

  test("accepts a specific natural reply", () => {
    expect(violatesConversationalRestraint("Você voltou justamente àquela palavra que apareceu antes.")).toBe(false);
  });

  test("rejects multiple questions", () => {
    expect(violatesConversationalRestraint("E depois? E o que aconteceu? Pode continuar.")).toBe(true);
  });
});
