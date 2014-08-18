declare class _H264LosslessEncoder {
    static SPS: number[];
    static PPS: number[];
    static sliceHeader: number[];
    static macroblockHeader: number[];
    static encodeFrame(imageData: ImageData): Uint8Array;
    static convertToYUV(rgba: Uint8Array): number[];
}
declare class MJPEGPlayer implements VideoPlayable {
    private static _promiseImmediate();
    private _src;
    private _srcUrl;
    private _element;
    public element : HTMLImageElement;
    public src : string;
    private _getBlobFromUrl(url);
    public onloadedmetadata: (e: HalfbakedEvent) => any;
    public onseeked: (e: HalfbakedEvent) => any;
    /** Stops playing when set to true, automatically returning to false */
    private _playSessionToken;
    private _currentVideoTime;
    public currentTime : number;
    private _show(time);
    private _waitToPlay();
    public play(): void;
    public pause(): void;
    public videoWidth : number;
    public videoHeight : number;
    public duration : number;
    private _createEvent();
}
interface VideoPlayable {
    src: string;
    play(): void;
    pause(): void;
    currentTime: number;
    videoWidth: number;
    videoHeight: number;
    duration: number;
    onseeked: (e: HalfbakedEvent) => any;
    onloadedmetadata: (e: HalfbakedEvent) => any;
}
interface HalfbakedEvent {
    bubbles: boolean;
    cancelable: boolean;
    cancelBubble: boolean;
    currentTarget: any;
    defaultPrevented: boolean;
    eventPhase: number;
    isTrusted: boolean;
    target: any;
    timeStamp: number;
    type: string;
}
interface AVIGeneralStructure {
    name: string;
    size: number;
    subtype: string;
    slicedContent?: BlobStream;
    contentOffset: number;
}
interface AVIGeneralChunk {
    id: string;
    size: number;
    contentOffset: number;
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
    static read(file: Blob): Promise<MJPEGVideo>;
    private static _consumeRiff(stream);
    private static _consumeHdrl(stream);
    private static _consumeAVIMainHeader(stream);
    private static _consumeMovi(stream);
    private static _consumeAVIIndex(stream);
    private static _parseAVIIndex(stream, movi, idx1, onframeparse?);
    private static _consumeStructureHead(stream, name, subtype, sliceContent?);
    private static _consumeChunkHead(stream, id);
    private static _consumeFourCC(stream);
    private static _consumeUint32(stream);
}
declare class MJPEGVideo {
    public blob: Blob;
    public frameInterval: number;
    public framePerSecond : number;
    public totalFrames: number;
    public duration : number;
    public width: number;
    public height: number;
    public frameIndices: AVIOldIndex[];
    public _onfulfilled: (frameNumber: number) => void;
    public fillFrameIndex(frameNumber: number, frameIndex?: AVIOldIndex): void;
    public getFrame(index: number): Promise<Blob>;
    public getFrameByTime(time: number): Promise<Blob>;
    /**
    Wait until the existence of target frame gets confirmed.
    */
    private _waitFrame(index);
    public getBackwardFrame(index: number): Promise<{
        index: number;
        data: Blob;
    }>;
    public getForwardFrame(index: number): Promise<{
        index: number;
        data: Blob;
    }>;
    private _exportJPEG(frameIndex);
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
