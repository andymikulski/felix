import React from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

const ConnectingModalContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;


const ConnectingModalContent = styled.div`
  background-color: #fff;
  padding: 5px;
  border-radius: 5px;
  box-shadow: 0 0 5px #000;
  z-index: 1;
  position: absolute;
  display: inline;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
`;

const ConnectingModalBackgroundDim = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: #000;
  opacity: 0.7;
  width: 100%;
  height: 100%;
  z-index: 0;
`;

export default class GenericMessageModal extends React.PureComponent<{ message: string }> {
  container: HTMLDivElement;
  constructor(props: any) {
    super(props);
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
  }

  componentWillUnmount() {
    document.body.removeChild(this.container);
  }

  render() {
    return ReactDOM.createPortal(
      <>
        <ConnectingModalContainer>
          <ConnectingModalBackgroundDim />
          <ConnectingModalContent>{this.props.message}</ConnectingModalContent>
        </ConnectingModalContainer>
      </>
      , this.container);
  }
}
