const parseWavHeader = (buffer: Buffer) => {
  const riff = buffer.toString("ascii", 0, 4);
  const wave = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error("Invalid WAV header");
  }
  const fmtIndex = buffer.indexOf("fmt ");
  if (fmtIndex < 0) {
    throw new Error("Missing fmt chunk");
  }
  const audioFormat = buffer.readUInt16LE(fmtIndex + 8);
  const numChannels = buffer.readUInt16LE(fmtIndex + 10);
  const sampleRate = buffer.readUInt32LE(fmtIndex + 12);
  const bitsPerSample = buffer.readUInt16LE(fmtIndex + 22);

  const dataIndex = buffer.indexOf("data");
  if (dataIndex < 0) {
    throw new Error("Missing data chunk");
  }
  const dataSize = buffer.readUInt32LE(dataIndex + 4);
  const dataStart = dataIndex + 8;

  return {
    audioFormat,
    numChannels,
    sampleRate,
    bitsPerSample,
    dataStart,
    dataSize,
  };
};

const buildWav = (
  audioFormat: number,
  numChannels: number,
  sampleRate: number,
  bitsPerSample: number,
  data: Buffer,
): Buffer => {
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = data.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(audioFormat, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  data.copy(buffer, 44);

  return buffer;
};

export const concatWavBuffers = (buffers: Buffer[]): Buffer => {
  if (buffers.length === 0) {
    throw new Error("No audio buffers to concat");
  }

  const firstHeader = parseWavHeader(buffers[0]);
  const chunks = buffers.map((buffer) => {
    const header = parseWavHeader(buffer);
    if (
      header.audioFormat !== firstHeader.audioFormat ||
      header.numChannels !== firstHeader.numChannels ||
      header.sampleRate !== firstHeader.sampleRate ||
      header.bitsPerSample !== firstHeader.bitsPerSample
    ) {
      throw new Error("WAV format mismatch between sections");
    }
    return buffer.subarray(header.dataStart, header.dataStart + header.dataSize);
  });

  const combined = Buffer.concat(chunks);
  return buildWav(
    firstHeader.audioFormat,
    firstHeader.numChannels,
    firstHeader.sampleRate,
    firstHeader.bitsPerSample,
    combined,
  );
};
