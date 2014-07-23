declare class _H264LosslessEncoder {
    static SPS: number[];
    static PPS: number[];
    static sliceHeader: number[];
    static macroblockHeader: number[];
    static encodeFrame(imageData: ImageData): Uint8Array;
    static convertToYUV(rgba: Uint8Array): number[];
}
interface AVIGeneralStructure {
    name: string;
    size: number;
    subtype: string;
    slicedData?: BlobStream;
}
interface AVIGeneralChunk {
    id: string;
    size: number;
    slicedData?: BlobStream;
}
interface AVIMainHeader {
    frameIntervalMicroseconds: number;
    totalFrames: number;
    width: number;
    height: number;
}
interface AVIOldIndex {
    byteOffset: number;
    byteLength: number;
}
declare class MJPEGReader {
    static read(file: Blob): Promise<MJPEG>;
    private static _consumeRiff(stream);
    private static _consumeHdrl(stream);
    private static _consumeAVIMainHeader(stream);
    private static _consumeMovi(stream);
    private static _consumeAVIIndex(stream);
    private static _exportJPEG(moviList, indexes);
    private static _consumeStructureHead(stream, name, subtype, sliceContainingData?);
    private static _consumeChunkHead(stream, id);
    private static _consumeFourCC(stream);
    private static _consumeUint32(stream);
}
declare class MJPEG {
    public frameInterval: number;
    public framePerSecond : number;
    public totalFrames: number;
    public duration : number;
    public width: number;
    public height: number;
    public frames: Blob[];
    public getFrame(index: number): Blob;
    public getFrameByTime(time: number): Blob;
    public getBackwardFrame(index: number): {
        index: number;
        data: Blob;
    };
    public getForwardFrame(index: number): {
        index: number;
        data: Blob;
    };
}
declare module MP4Container {
    class Box {
        constructor(boxType: string, extendedType?: number);
        public getByteLength(): number;
        public type: string;
    }
    class FullBox extends Box {
        public version: number;
        public flags: number;
        constructor(boxType: string, version: number);
        public getByteLength(): number;
    }
    class FileTypeBox extends Box {
        constructor();
        public majorBrand: string;
        public majorVersion: number;
        public compatibleBrands: string[];
        public getByteLength(): number;
    }
    class MovieBox extends Box {
        constructor();
    }
    class MovieFragmentBox extends Box {
        public boxes: {
            movieFragmentHeader: MovieFragmentHeaderBox;
            trackFragment?: TrackFragmentBox;
        };
        constructor(boxes: {
            movieFragmentHeader: MovieFragmentHeaderBox;
            trackFragment?: TrackFragmentBox;
        });
        public getByteLength(): number;
    }
    class MovieFragmentHeaderBox extends FullBox {
        constructor();
        public sequenceNumber: number;
        public getByteLength(): number;
    }
    class TrackFragmentBox extends Box {
        public boxes: {
            trackFragmentHeader: TrackFragmentHeaderBox;
        };
        constructor(boxes: {
            trackFragmentHeader: TrackFragmentHeaderBox;
        });
    }
    class TrackFragmentHeaderBox extends FullBox {
        private tfFlags;
        constructor(tfFlags: TrackFragmentHeaderFlags);
        public flagBits : number;
    }
    class TrackFragmentHeaderFlags {
        public baseDateOffsetPresent: boolean;
        public sampleDescriptionIndexPresent: boolean;
        public defaultSampleDurationPresent: boolean;
        public defaultSampleSizePresent: boolean;
        public defaultSampleFlagsPresent: boolean;
        public durationIsEmpty: boolean;
        public defaultBaseIsMoof: boolean;
        public getFlagBits(): number;
    }
}
