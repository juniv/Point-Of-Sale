import {
  Button,
  Modal,
  ModalContent,
  ModalOverlay,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Text,
  Flex,
} from "@chakra-ui/react";
import {
  createQR,
  encodeURL,
  findReference,
  FindReferenceError,
  TransactionRequestURLFields,
  ValidateTransferError,
} from "@solana/pay";
import { Keypair } from "@solana/web3.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../../contexts/workspace";

const QrModal = ({ onClose, isOpen, mint }: any) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const reference = useMemo(() => Keypair.generate().publicKey, []);
  const [confirmed, setConfirmed] = useState(false);
  const workspace = useWorkspace();

  useEffect(() => {
    // window.location is only available in the browser, so create the URL in here
    const { location } = window;
    const params = new URLSearchParams();
    params.append("mint", mint);
    params.append("reference", reference.toString());
    const apiUrl = `${location.protocol}//${location.host}/api/solpay?${params.toString()}`;
    // console.log(apiUrl);

    const urlParams: TransactionRequestURLFields = {
      link: new URL(apiUrl),
      label: "Juniverse",
      message: "Thanks for your order!",
    };

    const solanaUrl = encodeURL(urlParams);

    const qr = createQR(solanaUrl, 512, "transparent");
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qr.append(qrRef.current);
    }
  }, [mint, reference]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const connection = workspace.connection;

        if (!connection) return;

        const signatureInfo = await findReference(connection, reference, { finality: "confirmed" });

        /* TODO: Confirm valid transaction here */

        setConfirmed(true);
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return;
        }
        if (e instanceof ValidateTransferError) {
          // Transaction is invalid
          console.error("Transaction is invalid", e);
          return;
        }
        console.error("Unknown error", e);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <Flex
        position="fixed"
        top="0px"
        left="0px"
        right="0px"
        bottom="0px"
        zIndex={1000}
        backgroundColor="rgba(0, 0, 0, 0.3)"
        display={isOpen ? "flex" : "none"}
      />
      <Flex
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        backgroundColor="#FFF"
        padding="20px"
        zIndex={1000}
        display={isOpen ? "flex" : "none"}
        flexDirection="column"
      >
        <Flex display={confirmed ? "flex" : "none"}>
          <Text>Confirmed Transaction!</Text>
        </Flex>
        <div ref={qrRef} />
        <Button
          onClick={() => {
            setConfirmed(false);
            onClose();
          }}
        >
          Close
        </Button>
      </Flex>
    </>
  );
};

export default QrModal;
