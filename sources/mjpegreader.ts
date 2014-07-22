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
class MJPEGReader {
    static read(file: Blob) {
        return new Promise<MJPEG>((resolve, reject) => {
            var stream = new BlobStream(file);

            var aviMJPEG = this._readRiff(stream);
            var mjpeg = new MJPEG();
            mjpeg.frameInterval = aviMJPEG.mainHeader.frameIntervalMicroseconds / 1e6;
            mjpeg.totalFrames = aviMJPEG.mainHeader.totalFrames;
            mjpeg.width = aviMJPEG.mainHeader.width;
            mjpeg.height = aviMJPEG.mainHeader.height;
            mjpeg.frames = aviMJPEG.JPEGs;
            resolve(mjpeg);
        });
    }

    private static _readRiff(stream: BlobStream) {
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
                return this._readHdrl(stream);
            }).then((hdrlList) => {
                riffData.mainHeader = hdrlList.mainHeader;
                return this._readMovi(stream);
            }).then((moviList) => {
                moviStream = moviList.dataStream;
                return this._readAVIIndex(stream);
            }).then((indexes) => {
                riffData.JPEGs = this._exportJPEG(moviStream, indexes);
                return riffData;
            });
    }

    private static _readHdrl(stream: BlobStream) {
        var hdrlData = {
            dataStream: <BlobStream>null,
            mainHeader: <AVIMainHeader>null
        };
        return this._consumeStructureHead(stream, "LIST", "hdrl")
            .then((hdrlList) => {
                hdrlData.dataStream = hdrlList;
                return this._readAVIMainHeader(hdrlList);
            }).then((mainHeader) => {
                hdrlData.mainHeader = mainHeader;
                return Promise.resolve(hdrlData);
            });

        //var hdrlList = this._getTypedData(stream, "LIST", "hdrl");

        //var mainHeader = this._readAVIMainHeader(hdrlList);
        //return { dataArray: hdrlList, mainHeader: mainHeader }
    }

    private static _readAVIMainHeader(stream: BlobStream) {
        var headerStream: BlobStream;
        var aviMainHeader: AVIMainHeader = {
            frameIntervalMicroseconds: 0,
            totalFrames: 0,
            width: 0,
            height: 0
        }
        return this._consumeChunkHead(stream, "avih")
            .then((header) => {
                headerStream = header;
                return this._getLittleEndianedDword(headerStream);
            }).then((frameIntervalMicroseconds) => {
                aviMainHeader.frameIntervalMicroseconds = frameIntervalMicroseconds;
                return headerStream.seek(16);
            }).then(() => {
                return this._getLittleEndianedDword(headerStream);
            }).then((totalFrames) => {
                aviMainHeader.totalFrames = totalFrames;
                return this._getLittleEndianedDword(headerStream);
            }).then((width) => {
                aviMainHeader.width = width;
                return this._getLittleEndianedDword(headerStream);
            }).then((height) => {
                aviMainHeader.height = height;
                return Promise.resolve(aviMainHeader);
            });
    }

    private static _readMovi(stream: BlobStream) {
        var moviData = {
            dataStream: <BlobStream>null
        };
        return this._consumeStructureHead(stream, "LIST", "movi")
            .then((movi) => {
                moviData.dataStream = movi;
                return Promise.resolve(moviData);
            });
        //return { dataArray: moviList };
    }

    private static _readAVIIndex(stream: BlobStream) {
        return this._consumeChunkHead(stream, "idx1")
            .then((indexDataStream) => {
                var indexes: AVIOldIndex[] = [];

                var sequence = Promise.resolve<void>();
                for (var i = 0; i < indexDataStream.blob.size / 16; i++) {
                    ((i: number) => {
                        var index: AVIOldIndex = {
                            byteOffset: 0,
                            byteLength: 0
                        };
                        sequence = sequence
                            .then(() => {
                                return indexDataStream.seek(i * 16 + 8);
                            }).then(() => {
                                return this._getLittleEndianedDword(indexDataStream);
                            }).then((offset) => {
                                index.byteOffset = offset + 4; // ignore 'movi' string
                                return this._getLittleEndianedDword(indexDataStream);
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

    private static _consumeStructureHead(stream: BlobStream, name: string, subtype: string, sliceContainingData = false): Promise<BlobStream> {
        var head: AVIGeneralStructure = <any>{};

        return this._getFourCC(stream)
            .then((nameParam) => { // get name
                head.name = nameParam;
                return this._getLittleEndianedDword(stream);
            }).then((sizeParam) => { // get length
                head.size = sizeParam;
                if (head.name !== name)
                    return Promise.reject(new Error("Incorrect AVI format."));

                return this._getFourCC(stream).then((subtypeParam) => { // get subtype
                    if (subtypeParam !== subtype)
                        return Promise.reject(new Error("Unexpected name is detected for AVI structure."));

                    if (sliceContainingData)
                        head.slicedData = stream.slice(stream.byteOffset, stream.byteOffset + sizeParam - 4);
                    return Promise.resolve(head);    
                });    
            });
    }
    private static _consumeChunkHead(stream: BlobStream, id: string, sliceContainingData = false): Promise<BlobStream> {
        var head: AVIGeneralChunk = <any>{};

        return this._getFourCC(stream)
            .then((idParam) => { // get id
                head.id = idParam;
                return this._getLittleEndianedDword(stream);
            }).then((sizeParam) => { // get size
                if (head.id === id) {
                    if (sliceContainingData)
                        head.slicedData = stream.slice(stream.byteOffset, stream.byteOffset + sizeParam);
                    return Promise.resolve(head);
                }
                else if (head.id === "JUNK")
                    return stream.seek(stream.byteOffset + sizeParam)
                        .then(() => this._consumeChunkHead(stream, id));
                else
                    return Promise.reject(new Error("Unexpected id is detected for AVI chunk."));
            });
    }

    private static _getFourCC(stream: BlobStream) {
        return new Promise<string>((resolve, reject) => {
            stream.readBytesAs = "text";
            var promise = stream.readBytes<string>(4).then((result) => {
                resolve(result.data);
            });
            stream.readBytesAs = "as-is";
        });
    }

    private static _getLittleEndianedDword(stream: BlobStream) {
        return new Promise<number>((resolve, reject) => {
            stream.readBytes<ArrayBuffer>(4).then((result) => {
                var dataView = new DataView(result.data);
                resolve(dataView.getUint32(0, true));
            });
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