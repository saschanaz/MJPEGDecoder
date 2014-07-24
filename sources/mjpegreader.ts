//AVI File Format http://msdn.microsoft.com/en-us/library/windows/desktop/dd318187(v=vs.85).aspx
//AVI RIFF File Reference http://msdn.microsoft.com/en-us/library/windows/desktop/dd318189(v=vs.85).aspx
//AVIMAINHEADER structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318180(v=vs.85).aspx
//AVIOLDINDEX structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318181(v=vs.85).aspx
//BITMAPINFOHEADER structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318229(v=vs.85).aspx
"use strict";

interface AVIGeneralStructure {
    name: string;
    size: number;
    subtype: string;
    slicedData?: BlobStream;
}
interface AVIGeneralChunk {
    id: string;
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

/*
TODO
Return MJPEGVideo object when indices starts to be read.
Push each index as it is parsed -> _pushFrameIndices(frameIndex, frameNumber)
_pushFrameIndices should run _fill(i)
_fill is dynamically defined by getBackwardFrame/getForwardFrame, which resolves their Promises
turn completed token on when all indices are parsed
getBackwardFrame and getForwardFrame should return Promises, as it should wait until the requested frame gets fulfilled
getBackwardFrame/getForwardFrame(i) waits until frameIndices gets larger than i + 1
getBackwardFrame then finds the penultimate valid frame, while getForwardFrame gets last one.

OR

Instead change MJPEGReader to MJPEGStream object which returns a frame when requested
Problem: It still gives files rather than indices. 

MJPEGVideo would be prefered as of now.
*/
class MJPEGReader {
    static read(file: Blob) {
        var stream = new BlobStream(file);
        return this._consumeRiff(stream)
            .then((aviMJPEG) => {
                var mjpeg = new MJPEGVideo();
                mjpeg.blob = file;
                mjpeg.frameInterval = aviMJPEG.mainHeader.frameIntervalMicroseconds / 1e6;
                mjpeg.totalFrames = aviMJPEG.mainHeader.totalFrames;
                mjpeg.width = aviMJPEG.mainHeader.width;
                mjpeg.height = aviMJPEG.mainHeader.height;
                mjpeg.frameIndices = aviMJPEG.indices;
                return mjpeg;
            });
    }

    private static _consumeRiff(stream: BlobStream) {
        var riffData = {
            mainHeader: <AVIMainHeader>null,
            indices: <AVIOldIndex[]>null
        };
        var moviPosition: number;

        return this._consumeStructureHead(stream, "RIFF", "AVI ")
            .then(() => {
                return this._consumeHdrl(stream);
            }).then((hdrlList) => {
                riffData.mainHeader = hdrlList.mainHeader;
                return this._consumeMovi(stream);
            }).then((moviList) => {
                return this._consumeAVIIndex(stream, moviList.offset);
            }).then((indices) => {
                riffData.indices = indices;
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
            offset: 0,
            size: 0
        };
        return this._consumeStructureHead(stream, "LIST", "movi")
            .then((structure) => {
                moviData.offset = stream.byteOffset;
                moviData.size = structure.size;
                return stream.seek(stream.byteOffset + structure.size);
            }).then(() => {
                return moviData;
            });
        //return { dataArray: moviList };
    }

    private static _consumeAVIIndex(stream: BlobStream, moviOffset: number) {
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
                                index.byteOffset = moviOffset + offset + 4; // ignore 'movi' string and frame chunk header (-4 + 8)
                                return this._consumeUint32(stream);
                            }).then((length) => {
                                index.byteLength = length - 8; // ignore frame chunk header size
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
                        .then(() => this._consumeStructureHead(stream, name, subtype, sliceContainingData));
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

class MJPEGVideo {
    blob: Blob;

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
    frameIndices: AVIOldIndex[];

    getFrame(index: number) {
        var backward = this.getBackwardFrame(index);
        if (backward)
            return backward.data;
        else
            return;
    }
    getFrameByTime(time: number) {
        return this.getFrame(Math.floor(this.totalFrames * time / this.duration));
    }

    getBackwardFrame(index: number) {
        var i = index;
        while (i >= 0) {
            if (this.frameIndices[i])
                return { index: i, data: this._exportJPEG(this.frameIndices[i]) };
            else
                i--;
        }
        return;
    }

    getForwardFrame(index: number) {
        var i = index;
        while (i < this.totalFrames) {
            if (this.frameIndices[i])
                return { index: i, data: this._exportJPEG(this.frameIndices[i]) };
            else
                i++;
        }
        return;
    }

    private _exportJPEG(frameIndex: AVIOldIndex) {    
        return this.blob.slice(frameIndex.byteOffset, frameIndex.byteOffset + frameIndex.byteLength, "image/jpeg");
    }
}