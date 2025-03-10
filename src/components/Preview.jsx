import { useEffect, useRef, useState } from 'react';

function Preview({ webContainerInstance,isInitializedServer,setIsInitializedServer,url,setUrl }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    async function main() {
      console.log("main function called", isInitializedServer);
      // Only run installation and dev server setup once
      if (isInitializedServer) return;

      const installProcess = await webContainerInstance.spawn('npm', ['i', '--force']);
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log('Installation:', data);
        }
      }));
      const installExitCode = await installProcess.exit;
      
      if (installExitCode !== 0) {
        console.error('Installation failed');
        return;
      }

      const devProcess = await webContainerInstance.spawn('npm', ['run', 'dev']);
    //   devProcess.output.pipeTo(new WritableStream({
    //     write(data) {
    //     //   console.log('Dev server hain:', data);
    //     }
    //   }));
    //   console.log("completed------------------");
      setIsInitializedServer(true);

      webContainerInstance.on('server-ready', (port, url) => {
        // console.log('Server ready URL:', url);
        setUrl(url);
      });
    }

    if (webContainerInstance) {
      main();
    }

  
  }, [webContainerInstance]);



  useEffect(() => {
    if (isInitializedServer && !url) {
    //   console.log("this is calling");

      const handleServerReady = (port, url) => {
        // console.log("this is calling 2", url);
        setUrl(url);
      };

      webContainerInstance.on('server-ready', handleServerReady);

    
    }
  }, [isInitializedServer, url, webContainerInstance]);

  return (
    <>
  {url && (
  <iframe src={url} style={{ width: '100%', height: '100%' }} onLoad={() => console.log('Iframe pre-rendered')} />
)}
    {!url && (
        <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Loading...</p>
        </div>
    )}
    </>
  );
}

export default Preview;