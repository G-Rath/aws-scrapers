export const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from(Array(Math.ceil(arr.length / size))).map((_, i) =>
    arr.slice(i * size, i * size + size)
  );
