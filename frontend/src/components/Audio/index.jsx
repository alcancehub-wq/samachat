import { Button } from "@material-ui/core";
import React, { useEffect, useRef, useState } from "react";
import { getBackendUrl } from "../../config";

const LS_NAME = 'audioMessageRate';

export default function({ url }) {
    const audioRef = useRef(null);
    const [audioRate, setAudioRate] = useState( parseFloat(localStorage.getItem(LS_NAME) || "1") );
    const [showButtonRate, setShowButtonRate] = useState(false);
    const backendUrl = getBackendUrl();
    const normalizedBackend = backendUrl?.endsWith("/")
        ? backendUrl.slice(0, -1)
        : backendUrl;
    const isAbsolute = url?.startsWith("http");
    const needsReplace = url?.startsWith("http://backend") || url?.startsWith("https://backend");
    const audioUrl = needsReplace && normalizedBackend
        ? url.replace(/^https?:\/\/backend/, normalizedBackend)
        : isAbsolute
        ? url
        : normalizedBackend
        ? `${normalizedBackend}${url?.startsWith("/") ? "" : "/"}${url}`
        : url;

    useEffect(() => {
        audioRef.current.playbackRate = audioRate;
        localStorage.setItem(LS_NAME, audioRate);
    }, [audioRate]);

    useEffect(() => {
        audioRef.current.onplaying = () => {
            setShowButtonRate(true);
        };
        audioRef.current.onpause = () => {
            setShowButtonRate(false);
        };
        audioRef.current.onended = () => {
            setShowButtonRate(false);
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
        }
    }, [audioUrl]);

    const toogleRate = () => {
        let newRate = null;

        switch(audioRate) {
            case 0.5:
                newRate = 1;
                break;
            case 1:
                newRate = 1.5;
                break;
            case 1.5:
                newRate = 2;
                break;
            case 2:
                newRate = 0.5;
                break;
            default:
                newRate = 1;
                break;
        }
        
        setAudioRate(newRate);
    };

    return (
        <>
            <audio ref={audioRef} controls preload="metadata">
                <source src={audioUrl} type="audio/ogg; codecs=opus"></source>
                <source src={audioUrl} type="audio/ogg"></source>
                <source src={audioUrl} type="audio/mpeg"></source>
                Seu navegador não suporta áudio
            </audio>
            {showButtonRate && <Button style={{marginLeft: "5px", marginTop: "-45px"}} onClick={toogleRate}>{audioRate}x</Button>}
        </>
    );
}