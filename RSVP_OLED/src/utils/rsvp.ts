export interface WordInfo {
  word: string;
  pivotIndex: number;
  prefix: string;
  pivot: string;
  suffix: string;
  delayFactor: number; // For commas, periods, etc.
}

export function processText(text: string): WordInfo[] {
  // Split by whitespace and filter empty
  const rawWords = text.split(/\s+/).filter(w => w.length > 0);
  
  return rawWords.map(word => {
    const pivotIndex = getPivotIndex(word);
    
    // Calculate delay factor based on punctuation
    let delayFactor = 1.0;
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
      delayFactor = 2.5;
    } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
      delayFactor = 1.5;
    } else if (word.length > 8) {
      delayFactor = 1.2;
    }

    return {
      word,
      pivotIndex,
      prefix: word.substring(0, pivotIndex),
      pivot: word.substring(pivotIndex, pivotIndex + 1),
      suffix: word.substring(pivotIndex + 1),
      delayFactor
    };
  });
}

function getPivotIndex(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}
