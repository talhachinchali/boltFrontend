// src/components/Terminal.jsx
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const TerminalComponent = ({ webcontainer,updateFileContent,files,setFiles }) => {
  const terminalRef = useRef(null);
  const fitAddon = useRef(new FitAddon());
  const terminal = useRef(null);
  const commandBuffer = useRef("");



  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Terminal
    terminal.current = new Terminal({
      cursorBlink: true,
      theme: { background: "#1e1e1e", foreground: "#ffffff" },
    });

    terminal.current.loadAddon(fitAddon.current);
    terminal.current.open(terminalRef.current);
    fitAddon.current.fit();

    terminal.current.write("$ ");

    const runCommand = async (command) => {
        if (!webcontainer) {
          terminal.current.writeln("\r\nError: WebContainer not initialized");
          terminal.current.write("\r\n$ ");
          return;
        }
      
        try {
          console.log(`Executing: ${command}`);
          const [cmd, ...args] = command.split(" ");
          if (!webcontainer || !webcontainer.fs) {
            console.error("WebContainer is not initialized yet.");
            return;
          }
      
          if (cmd === "npm" && (args[0] === "i" || args[0] === "install")) {
            // Step 1: Read package.json
            const packageJsonPath = "package.json";
            const packageJsonFile = await webcontainer.fs.readFile(packageJsonPath, "utf-8");
            const packageJson = JSON.parse(packageJsonFile);
            console.log(packageJson, "packageJson file");

            // Step 2: Extract package name
            const packageName = args[1];
            console.log(packageName,"packageName");
            if (packageName) {
              packageJson.dependencies = packageJson.dependencies || {};
              packageJson.dependencies[packageName] = "latest"; // Add package to dependencies
      
              // Step 3: Write updated package.json back to WebContainer
              try {
                await webcontainer.fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
                console.log("Successfully wrote to package.json");
                const packageJsonFile=await webcontainer.fs.readFile(packageJsonPath, "utf-8");
                updateFileContent(packageJsonPath, JSON.stringify(packageJson, null, 2));
                console.log(packageJsonFile,"packageJsonFile afer writing",packageJsonPath);
              } catch (writeError) {
                console.error("Error writing to package.json:", writeError);
                terminal.current.writeln(`\r\nError writing to package.json: ${writeError.message}`);
              }
            }
          }
      
          // Run the actual command
          const process = await webcontainer.spawn(cmd, args);
          const outputStream = process.output.getReader();
      
          while (true) {
            const { value, done } = await outputStream.read();
            if (done) break;
            terminal.current.write(value);
          }
      
          await process.exit;
          terminal.current.writeln("");
        } catch (error) {
          terminal.current.writeln(`\r\nExecution Error: ${error.message}`);
        }
      
        terminal.current.write("\r\n$ ");
      };
      

    // Handle user input
    terminal.current.onData((data) => {
      const charCode = data.charCodeAt(0);

      if (charCode === 13) {
        // ENTER key
        terminal.current.write("\r\n");
        const command = commandBuffer.current.trim();
        if (command) {
          runCommand(command);
        } else {
          terminal.current.write("$ ");
        }
        commandBuffer.current = "";
      } else if (charCode === 127) {
        // BACKSPACE key
        if (commandBuffer.current.length > 0) {
          commandBuffer.current = commandBuffer.current.slice(0, -1);
          terminal.current.write("\b \b");
        }
      } else {
        // Normal character input
        commandBuffer.current += data;
        terminal.current.write(data);
      }
    });

    return () => {
      terminal.current.dispose();
    };
  }, [webcontainer]);

  return <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />;
};

export default TerminalComponent;
