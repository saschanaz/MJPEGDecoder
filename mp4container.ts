/*
    W3C ISO BMFF Byte Stream Format
    ISO/IEC 14496-12:2012(E)
*/
module MP4Container {
    //numbers are big endianed

    //4.2 Object Structure
    export class Box {
        constructor(boxType: string, extendedType?: number) {
            this.type = boxType;
        }
        getByteLength() {//size of the box
            return 4;//type field
            //0 and 1 are special values
        }
        type: string;
    }
    export class FullBox extends Box {
        flags = 0;
        constructor(boxType: string, public version: number) {
            super(boxType);
        }
        getByteLength() {//size of the box
            return super.getByteLength()
                + 1//version
                + 3//flags
        }
    }
    //class UuidBox extends Box {
    //    userType = new Uint8Array(16);
    //    constructor() {
    //        super("uuid");
    //    }
    //}

    
    /*
        W3C 3. Initialization Segments

        An ISO BMFF initialization segment is defined in this specification as
        a single File Type Box (ftyp) followed by a single Movie Header Box (moov).

        Valid top-level boxes such as pdin, free, and sidx ...
        ... other than ftyp, moov, styp, moof, and mdat ...
        ... ignored by the user agent and are not considered part of the
        initialization segment in this specification.

        ISO/IEC 6.2.3 Box Order
    */
    // ISO/IEC 4.3
    export class FileTypeBox extends Box {
        constructor() {
            super("ftyp");
        }

        majorBrand = "mp41";
        majorVersion = 0;
        compatibleBrands = ["mp41"];
        getByteLength() {
            return super.getByteLength()
                + 4//majorBrand
                + 4//majorVersion
                + 4;//compatibleBrands
        }
    }
    //ISO/IEC 8.2.1
    export class MovieBox extends Box {
        constructor() {
            super("moov");
        }
    }
    //ISO/IEC 8.8.4
    export class MovieFragmentBox extends Box {
        constructor(public boxes: {
            movieFragmentHeader: MovieFragmentHeaderBox;
            trackFragment?: TrackFragmentBox;
        }) {
            super("moof");
        }

        getByteLength() {
            var byteLength
                = super.getByteLength()
                + this.boxes.movieFragmentHeader.getByteLength();
            if (this.boxes.trackFragment)
                byteLength += this.boxes.trackFragment.getByteLength();
            return byteLength;
        }
    }
    //ISO/IEC 8.8.5
    export class MovieFragmentHeaderBox extends FullBox {
        constructor() {
            super("mfhd", 0);
        }
        sequenceNumber: number;

        getByteLength() {
            return super.getByteLength()
                + 4//sequenceNumber
        }
    }
    //ISO/IEC 8.8.6
    export class TrackFragmentBox extends Box {
        constructor(public boxes: {
            trackFragmentHeader: TrackFragmentHeaderBox;
        }) {
            super("traf");
        }
    }
    //ISO/IEC 8.8.7
    export class TrackFragmentHeaderBox extends FullBox {
        constructor(private tfFlags: TrackFragmentHeaderFlags) {
            super("tfhd", 0);
        }
        get flagBits() {
            return this.tfFlags.getFlagBits();
        }
    }
    export class TrackFragmentHeaderFlags {
        baseDateOffsetPresent: boolean;
        sampleDescriptionIndexPresent: boolean;
        defaultSampleDurationPresent: boolean;
        defaultSampleSizePresent: boolean;
        defaultSampleFlagsPresent: boolean;
        durationIsEmpty: boolean;
        defaultBaseIsMoof: boolean;

        getFlagBits() {
            var flag = 0;
            if (this.baseDateOffsetPresent)
                flag |= 0x000001;
            if (this.sampleDescriptionIndexPresent)
                flag |= 0x000002;
            if (this.defaultSampleDurationPresent)
                flag |= 0x000008;
            if (this.defaultSampleSizePresent)
                flag |= 0x000010;
            if (this.defaultSampleFlagsPresent)
                flag |= 0x000020;
            if (this.durationIsEmpty)
                flag |= 0x010000;
            if (this.defaultBaseIsMoof)
                flag |= 0x020000;
            return flag;
        }
    }
}
