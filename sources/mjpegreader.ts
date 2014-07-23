//AVI File Format http://msdn.microsoft.com/en-us/library/windows/desktop/dd318187(v=vs.85).aspx
//AVI RIFF File Reference http://msdn.microsoft.com/en-us/library/windows/desktop/dd318189(v=vs.85).aspx
//AVIMAINHEADER structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318180(v=vs.85).aspx
//AVIOLDINDEX structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318181(v=vs.85).aspx
//BITMAPINFOHEADER structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318229(v=vs.85).aspx
"use strict";

interface AVIGeneralStructure {
    name: string; // former type
    size: number;
    subtype: string; // former name
    slicedData?: BlobStream;
}
interface AVIGeneralChunk {
    id: string; // former name
    size: number;
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
class MJPEGReader {
    static read(file: Blob) {
        var stream = new BlobStream(file);
        return this._consumeRiff(stream)
            .then((aviMJPEG) => {
                var mjpeg = new MJPEG();
                mjpeg.frameInterval = aviMJPEG.mainHeader.frameIntervalMicroseconds / 1e6;
                mjpeg.totalFrames = aviMJPEG.mainHeader.totalFrames;
                mjpeg.width = aviMJPEG.mainHeader.width;
                mjpeg.height = aviMJPEG.mainHeader.height;
                mjpeg.frames = aviMJPEG.JPEGs;
                return mjpeg;
            });
    }

    private static _consumeRiff(stream: BlobStream) {
        /*
        TODO: all functions except readMovi should just consume the stream, not copy it by slicing.
        getTypedData -> consumeStructureHead (it still can provide sliced stream to read outside of consuming order)
        interface AVIGeneralStructure {
            name: string; // former type
            size: number;
            subtype: string; // former name
            data?: BlobStream;
        }
        getNonTypedData -> consumeChunkHead
        interface AVIGeneralChunk {
            id: string; // former name
            size: number;
            data?: BlobStream;
        }
        */

        var riffData = {
            mainHeader: <AVIMainHeader>null,
            JPEGs: <Blob[]>null
        };
        var moviStream: BlobStream;

        return this._consumeStructureHead(stream, "RIFF", "AVI ")
            .then(() => {
                return this._consumeHdrl(stream);
            }).then((hdrlList) => {
                riffData.mainHeader = hdrlList.mainHeader;
                return this._consumeMovi(stream);
            }).then((moviList) => {
                moviStream = moviList.dataStream;
                return this._consumeAVIIndex(stream);
            }).then((indexes) => {
                riffData.JPEGs = this._exportJPEG(moviStream, indexes);
                return riffData;
            });
    }

    private static _consumeHdrl(stream: BlobStream) {
        var endPosition: number;
        var hdrlData = {
            mainHeader: <AVIMainHeader>null
        };
        return this._consumeStructureHead(stream, "LIST", "hdrl")
            .then((structure) => {
                endPosition = stream.byteOffset + structure.size;
                return this._consumeAVIMainHeader(stream);
            }).then((mainHeader) => {
                hdrlData.mainHeader = mainHeader;
                return stream.seek(endPosition);
            }).then(() => {
                return hdrlData;
            });

        //var hdrlList = this._getTypedData(stream, "LIST", "hdrl");

        //var mainHeader = this._readAVIMainHeader(hdrlList);
        //return { dataArray: hdrlList, mainHeader: mainHeader }
    }

    private static _consumeAVIMainHeader(stream: BlobStream) {
        var endPosition: number;
        var aviMainHeader: AVIMainHeader = {
            frameIntervalMicroseconds: 0,
            totalFrames: 0,
            width: 0,
            height: 0
        }
        return this._consumeChunkHead(stream, "avih")
            .then((chunk) => {
                endPosition = stream.byteOffset + chunk.size;
                return this._consumeUint32(stream);
            }).then((frameIntervalMicroseconds) => { // frame interval
                aviMainHeader.frameIntervalMicroseconds = frameIntervalMicroseconds;
                return stream.seek(stream.byteOffset + 12);
            }).then(() => {
                return this._consumeUint32(stream);
            }).then((totalFrames) => { // total frame
                aviMainHeader.totalFrames = totalFrames;
                return stream.seek(stream.byteOffset + 12);
            }).then(() => {
                return this._consumeUint32(stream);
            }).then((width) => { // width
                aviMainHeader.width = width;
                return this._consumeUint32(stream);
            }).then((height) => { // height
                aviMainHeader.height = height;
                return stream.seek(endPosition);
            }).then(() => {
                return aviMainHeader;
            });
    }

    private static _consumeMovi(stream: BlobStream) {
        var moviData = {
            dataStream: <BlobStream>null
        };
        return this._consumeStructureHead(stream, "LIST", "movi", true)
            .then((structure) => {
                moviData.dataStream = structure.slicedData;
                return moviData;
            });
        //return { dataArray: moviList };
    }

    private static _consumeAVIIndex(stream: BlobStream) {
        return this._consumeChunkHead(stream, "idx1")
            .then((indexChunk) => {
                var indexes: AVIOldIndex[] = [];

                var sequence = Promise.resolve<void>();
                for (var i = 0; i < indexChunk.size / 16; i++) {
                    ((i: number) => {
                        var index: AVIOldIndex = {
                            byteOffset: 0,
                            byteLength: 0
                        };
                        sequence = sequence
                            .then(() => {
                                return stream.seek(stream.byteOffset + 8);
                            }).then(() => {
                                return this._consumeUint32(stream);
                            }).then((offset) => {
                                index.byteOffset = offset + 4; // ignore 'movi' string
                                return this._consumeUint32(stream);
                            }).then((length) => {
                                index.byteLength = length;
                                if (length > 0)
                                    indexes[i] = index;
                            });
                    })(i);
                }
                return sequence.then(() => {
                    return Promise.resolve(indexes);
                });
            });
    }

    private static _exportJPEG(moviList: BlobStream, indexes: AVIOldIndex[]) {
        // do not +8, 'movi' string was already ignored.

        var JPEGs: Blob[] = [];
        for (var i = 0; i < indexes.length; i++) {
            if (indexes[i])
                JPEGs[i] = moviList.blob.slice(indexes[i].byteOffset, indexes[i].byteOffset + indexes[i].byteLength);
        }
        return JPEGs;
    }

    private static _consumeStructureHead(stream: BlobStream, name: string, subtype: string, sliceContainingData = false): Promise<AVIGeneralStructure> {
        var head: AVIGeneralStructure = <any>{};

        return this._consumeFourCC(stream)
            .then((nameParam) => { // get name
                head.name = nameParam;
                return this._consumeUint32(stream);
            }).then((sizeParam) => { // get length
                head.size = sizeParam - 4; // size without subtype
                if (head.name === name)
                    return this._consumeFourCC(stream).then((subtypeParam) => { // get subtype
                        if (subtypeParam !== subtype)
                            return Promise.reject(new Error("Unexpected name is detected for AVI structure."));

                        if (sliceContainingData)
                            head.slicedData = stream.slice(stream.byteOffset, stream.byteOffset + head.size);
                        return Promise.resolve(head);    
                    });
                else if (head.name === "JUNK")
                    return stream.seek(stream.byteOffset + sizeParam)
                        .then(() => this._consumeStructureHead(stream, name, subtype));
                else
                    return Promise.reject(new Error("Incorrect AVI format."));
            });
    }
    private static _consumeChunkHead(stream: BlobStream, id: string): Promise<AVIGeneralChunk> {
        var head: AVIGeneralChunk = <any>{};

        return this._consumeFourCC(stream)
            .then((idParam) => { // get id
                head.id = idParam;
                return this._consumeUint32(stream);
            }).then((sizeParam) => { // get size
                head.size = sizeParam;

                if (head.id === id)
                    return Promise.resolve(head);
                else if (head.id === "JUNK")
                    return stream.seek(stream.byteOffset + sizeParam)
                        .then(() => this._consumeChunkHead(stream, id));
                else
                    return Promise.reject(new Error("Unexpected id is detected for AVI chunk."));
            });
    }

    private static _consumeFourCC(stream: BlobStream) {
        return new Promise<string>((resolve, reject) => {
            stream.readBytesAs = "text";
            var promise = stream.readBytes<string>(4).then((result) => {
                resolve(result.data);
            });
            stream.readBytesAs = "as-is";
        });
    }

    private static _consumeUint32(stream: BlobStream) {
        return stream.readBytes<ArrayBuffer>(4)
            .then((result) => {
                var dataView = new DataView(result.data);
                return dataView.getUint32(0, true);
            });
    }
}

class MJPEG {
    frameInterval: number;//seconds. Please convert it from microseconds
    get framePerSecond() {
        return 1 / this.frameInterval;
    }
    totalFrames: number;
    get duration() {
        return this.totalFrames * this.frameInterval;
    }
    width: number;
    height: number;
    frames: Blob[];

    getFrame(index: number) {
        var backward = this.getBackwardFrame(index);
        if (backward)
            return backward.data;
        else
            return;
    }
    getFrameByTime(time: number) {
        return this.getFrame(this.totalFrames * time / this.duration);
    }

    getBackwardFrame(index: number) {
        var i = index;
        while (i >= 0) {
            if (this.frames[i])
                return { index: i, data: this.frames[i] };
            else
                i--;
        }
        return;
    }

    getForwardFrame(index: number) {
        var i = index;
        while (i < this.totalFrames) {
            if (this.frames[i])
                return { index: i, data: this.frames[i] };
            else
                i++;
        }
        return;
    }
}