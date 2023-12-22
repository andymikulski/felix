import React from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

const ControllerContainer = styled.div`
  height: 100vh;
  width: 100vw;
  position: relative;
  transform: translate(-50%, -50%);
  align-items: center;
  display: flex;
`;

// Big colorful button which takes up 1/3rd of the screen
const Button = styled.button<{ color: string }>`
  flex-grow: 1;
  height: 33%;
  background-color: ${(props) => props.color};
  border-radius: 5px;
  box-shadow: 0 0 5px #000;
  z-index: 1;
  font-size: 2em;
  font-weight: bold;
  color: #000;
  display: inline;

  &:hover,
  &:focus {
    /* slightly brighter "glow" using the props.color provided */
    filter: saturate(2);
    box-shadow: 0 0 5px ${(props) => props.color};

    color: #fff;
  }
`;

export default class ControllerPlayerUI extends React.PureComponent<{ currentWord: string, onPass: () => void, onCorrect: () => void, onFail: () => void }> {
  render() {
    console.log('uhh rendering', this.props.currentWord);
    // Render 'pass', 'correct', 'fail' buttons here
    return (
      <>
        <ControllerContainer>
          <Button color={"yellow"} onClick={this.props.onPass}>Pass</Button>
          <Button color={"green"} onClick={this.props.onCorrect}>Correct</Button>
          <Button color={"red"} onClick={this.props.onFail}>Fail</Button>
        </ControllerContainer>
      </>
    )
  }
}
