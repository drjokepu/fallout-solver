/// <reference path="../typings/tsd.d.ts" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';

declare function require(name: string): any;
require("!style!css!less!../less/style.less")

class Store {
	private candidates: Candidate[];
	private callbacks: (() => void)[];
	private nextCandidateId: number;
	
	constructor() {
		this.candidates = [];
		this.callbacks = [];
		this.nextCandidateId = 0;
	}
	
	addCallback(callback: () => void): void {
		this.callbacks.push(callback);
	}
	
	removeCallback(callback: () => void): void {
		this.callbacks = this.callbacks.filter(cb => cb !== callback);
	}
	
	emitUpdate(): void {
		for (let cb of this.callbacks) {
			cb();
		}
	}
	
	getCandidates(): Candidate[] {
		return this.candidates;
	}
	
	getOnlyValid(): Candidate {
		if (this.candidates.length <= 1) {
			return null;
		}
		
		let firstValid: Candidate = null;
		for (let cand of this.candidates) {
			if (cand.isValid(this.candidates)) {
				if (firstValid === null) {
					firstValid = cand;
				} else {
					return null;
				}
			}
		}
		
		return firstValid;
	}
	
	addCandidate(value: string): boolean {
		if (this.candidates.find(c => c.value === value)) {
			return false;
		}
		
		if (this.candidates.length > 0 && this.candidates[0].value.length !== value.length) {
			return false;
		}
		
		this.candidates.push(new Candidate(this.nextCandidateId++, value));
		this.emitUpdate();
		return true;
	}
	
	reset(): void {
		this.candidates = [];
		this.emitUpdate();
	}
	
	updateCandidateMatches(id: number, matches: number) {
		var candidate = this.candidates.find(c => c.id === id);
		if (candidate) {
			candidate.matches = matches;
			this.emitUpdate();
		}
	}
}

class Candidate {
	id: number;
	value: string;
	matches: number;
	
	constructor(id: number, value: string) {
		this.id = id;
		this.value = value;
		this.matches = null;
	}
	
	key(): string {
		return this.id.toString();
	}
	
	isValid(candidates: Candidate[]): boolean {
		if (this.matches !== null && this.matches !== this.value.length) {
			return false;
		}
		
		for (let cand of candidates) {
			if (cand.id === this.id) {
				continue;
			}
			
			if (cand.matches === null) {
				continue;
			}
			
			if (Candidate.getMatchCount(cand.value, this.value) !== cand.matches) {
				return false;
			}
		}
		
		return true;
	}
	
	private static getMatchCount(s0: string, s1: string): number {
		let counter = 0;
		for (let i = 0; i < s0.length; i++) {
			if (s0[i] === s1[i]) {
				counter++;
			}
		}
		
		return counter;
	}
}

var store = new Store();

var App = React.createClass({
	componentDidMount: function() {
		store.addCallback(this.didUpdate);
	},
	componentWillUnmount: function() {
		store.removeCallback(this.didUpdate);
	},
	didUpdate: function() {
		this.forceUpdate();
	},
	render: function() {
		const onlyValid = store.getOnlyValid();
		const candidates = store.getCandidates().map(c =>
			<CandidateListItem key={c.key()} candidate={c} onlyValid={onlyValid && c.id === onlyValid.id} />);
		
		return (
			<div className="app">
				<h1>Fallout 3 Password Solver</h1>
				<div className="solver">
					<InputBar />
					<ul className="candidates">
						{candidates}
					</ul>
				</div>
			</div>
		);
	}
});

interface InputBarState {
	text: string;
}

var InputBar = React.createClass({
	getInitialState: function() {
		return {
			text: ''
		};
	},
	didTextBoxChange: function(ev: React.SyntheticEvent) {
		this.setState({
			text: (ev.target as HTMLInputElement).value
		});
	},
	didSubmit: function(ev: React.SyntheticEvent) {
		ev.preventDefault();
		
		const state = this.state as InputBarState;
		if (state.text.trim().length > 0) {
			if (store.addCandidate(state.text.trim().toUpperCase())) {
				this.setState({ text: '' });
			}
		}
	},
	didReset: function() {
		this.setState({ text: '' });
		store.reset();
	},
	render: function() {
		return (
			<form onSubmit={this.didSubmit} className="input-bar">
				<label>
					<span className="input-bar-label">Candidate:</span>
					<input type="text" className="input-bar-text-box" value={this.state.text} autoFocus={true} onChange={this.didTextBoxChange} />
					<button type="submit">Add</button>
					<button type="button" onClick={this.didReset}>Reset</button>
				</label>
			</form>
		);
	}
});

interface CandidateListItemProps {
	key: string;
	candidate: Candidate;
	onlyValid: boolean;
}

var CandidateListItem = React.createClass<CandidateListItemProps, any>({
	didChangeRadioButton: function(ev: React.SyntheticEvent) {
		const props = this.props as CandidateListItemProps;
		store.updateCandidateMatches(props.candidate.id, parseInt((ev.target as HTMLInputElement).value, 10));
	},
	render: function() {
		const props = this.props as CandidateListItemProps;
		const valid = props.candidate.isValid(store.getCandidates());
		const className = valid ? (props.onlyValid ? 'match-value-only-valid' : 'match-value-valid') : 'match-value-invalid';
		
		let radioButtons: JSX.Element[] = new Array(props.candidate.value.length);
		for (let i = 0; i < props.candidate.value.length; i++) {
			radioButtons[i] = (
				<label key={i}>
					<input type="radio" name="matches" value={i.toString()} disabled={!valid}
						onChange={this.didChangeRadioButton} />
					<span>{i}</span>
				</label>
			);
		}
		
		return (
			<li className={className}>
				<span>{props.candidate.value}</span>
				<form className="matches">
					{radioButtons}
				</form>
			</li>
		);
	}
})

document.addEventListener('DOMContentLoaded', function () {
	ReactDOM.render(<App />, document.getElementById('app'));
});