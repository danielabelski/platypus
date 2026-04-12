import { describe, it, expect } from "vitest";
import { calculateCardPosition, type CardRow } from "./kanban-positioning.ts";

describe("calculateCardPosition", () => {
  describe("inserting at the top (afterCardId = null)", () => {
    it("should return position 1.0 when column is empty", () => {
      const result = calculateCardPosition([], null);
      expect(result.position).toBe(1.0);
      expect(result.needsRebalance).toBe(false);
      expect(result.afterIndex).toBe(-1);
    });

    it("should return half the first card's position", () => {
      const cards: CardRow[] = [{ id: "a", position: 2.0 }];
      const result = calculateCardPosition(cards, null);
      expect(result.position).toBe(1.0);
      expect(result.needsRebalance).toBe(false);
    });
  });

  describe("inserting after a specific card", () => {
    it("should add 1.0 when inserting after the last card", () => {
      const cards: CardRow[] = [
        { id: "a", position: 1.0 },
        { id: "b", position: 2.0 },
      ];
      const result = calculateCardPosition(cards, "b");
      expect(result.position).toBe(3.0);
      expect(result.afterIndex).toBe(1);
      expect(result.needsRebalance).toBe(false);
    });

    it("should compute midpoint when inserting between two cards", () => {
      const cards: CardRow[] = [
        { id: "a", position: 1.0 },
        { id: "b", position: 3.0 },
      ];
      const result = calculateCardPosition(cards, "a");
      expect(result.position).toBe(2.0);
      expect(result.afterIndex).toBe(0);
    });

    it("should throw when afterCardId is not found", () => {
      const cards: CardRow[] = [{ id: "a", position: 1.0 }];
      expect(() => calculateCardPosition(cards, "nonexistent")).toThrow(
        "afterCardId not found in column",
      );
    });
  });

  describe("rebalancing detection", () => {
    it("should flag needsRebalance when gap is less than 0.001", () => {
      const cards: CardRow[] = [
        { id: "a", position: 1.0 },
        { id: "b", position: 1.0005 },
      ];
      const result = calculateCardPosition(cards, "a");
      expect(result.needsRebalance).toBe(true);
    });

    it("should not flag needsRebalance when gap is sufficient", () => {
      const cards: CardRow[] = [
        { id: "a", position: 1.0 },
        { id: "b", position: 2.0 },
      ];
      const result = calculateCardPosition(cards, "a");
      expect(result.needsRebalance).toBe(false);
    });

    it("should not flag needsRebalance when inserting after the last card", () => {
      const cards: CardRow[] = [{ id: "a", position: 1.0 }];
      const result = calculateCardPosition(cards, "a");
      expect(result.needsRebalance).toBe(false);
    });
  });
});
