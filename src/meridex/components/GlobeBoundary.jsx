import React, { Component } from "react";

export default class GlobeBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn("Globe render failed:", err);
  }
  render() {
    if (this.state.hasError) {
      return <div className="mx-land-globe-fallback" aria-hidden="true" />;
    }
    return this.props.children;
  }
}
