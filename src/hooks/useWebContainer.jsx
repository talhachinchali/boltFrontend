import { useEffect, useState } from "react";
import { WebContainer } from "@webcontainer/api";

let webcontainerInstance = null; // Global variable to store WebContainer instance

export function useWebContainer() {
    // console.log("webcontainerInstance inside hook",webcontainerInstance);
    const [webcontainer, setWebcontainer] = useState(webcontainerInstance);
    const [error, setError] = useState(null);

    useEffect(() => {
       
        if (!webcontainerInstance) {
            WebContainer.boot()
                .then((instance) => {
                    webcontainerInstance = instance;
                    setWebcontainer(instance);
                })
                .catch((err) => {
                    setError(err instanceof Error ? err : new Error("Failed to boot WebContainer"));
                });
        }
    }, []);

    return { webcontainer, error };
}
