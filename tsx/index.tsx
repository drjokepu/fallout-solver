/// <reference path="../typings/tsd.d.ts" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import dict from './dict';

declare function require(name: string): any;
require("!style!css!less!../less/style.less");

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
		if (this.candidates.length < 1) {
			return null;
		}
		
		if (this.candidates.length === 1) {
			const c0 = this.candidates[0];
			return c0.matches === c0.value.length ? c0 : null;
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
	
	getFixedCandidateLength(): number {
		if (this.candidates.length < 1) {
			return null;
		} else {
			return this.candidates[0].value.length;
		}
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
	
	removeCandidate(id: number): void {
		this.candidates = this.candidates.filter(c => c.id !== id);
		this.emitUpdate();
	}
	
	reset(): void {
		this.candidates = [];
		this.emitUpdate();
	}
	
	updateCandidateMatches(id: number, matches: number): void {
		var candidate = this.candidates.find(c => c.id === id);
		if (candidate) {
			candidate.matches = matches;
			this.emitUpdate();
		}
	}
	
	updateCandidateValue(id: number, value: string): void {
		var candidate = this.candidates.find(c => c.id === id);
		if (candidate) {
			candidate.value = value;
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
			text: (ev.target as HTMLInputElement).value.toUpperCase()
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
		
		this.refs.textBox.focus();
	},
	didReset: function() {
		this.setState({ text: '' });
		store.reset();
		this.refs.textBox.focus();
	},
	render: function() {
		return (
			<form onSubmit={this.didSubmit} className="input-bar">
				<label>
					<span className="input-bar-label">Candidate:</span>
					<input type="text" className="input-bar-text-box" value={this.state.text} autoFocus={true}
						onChange={this.didTextBoxChange} ref="textBox" list="suggestions" />
					<Suggestions length={store.getFixedCandidateLength()} />
				</label>
				<button type="submit">Add</button>
				<button type="button" onClick={this.didReset}>Reset</button>
			</form>
		);
	}
});

interface SuggestionProps {
	length: number
}

var Suggestions = React.createClass<SuggestionProps, any>({
	shouldComponentUpdate(nextProps: SuggestionProps, nextState: any): boolean {
		return (this.props as SuggestionProps).length !== nextProps.length;
	},
	render: function() {
		const props = this.props as SuggestionProps;
		const words = props.length === null ? dict : dict.filter(w => w.length === props.length);
		const options = words.map(w => <option key={w} value={w}></option>);
		
		return (
			<datalist id="suggestions">
				{options}
			</datalist>
		);
	}
});

interface CandidateListItemProps {
	key: string;
	candidate: Candidate;
	onlyValid: boolean;
}

interface CandidateListItemState {
	editMode: boolean;
	needsFocus: boolean;
	editValue: string;
}

var CandidateListItem = React.createClass<CandidateListItemProps, CandidateListItemState>({
	getInitialState: function(): CandidateListItemState {
		return {
			editMode: false,
			needsFocus: false,
			editValue: null
		} as CandidateListItemState;
	},
	componentDidUpdate: function() {
		const state = this.state as CandidateListItemState;
		if (state.editMode && state.needsFocus) {
			this.refs.editCandidateValue.focus();
			this.refs.editCandidateValue.select();
			this.setState({
				needsFocus: false
			});
		}
	},
	didChangeRadioButton: function(ev: React.SyntheticEvent) {
		const props = this.props as CandidateListItemProps;
		store.updateCandidateMatches(props.candidate.id, parseInt((ev.target as HTMLInputElement).value, 10));
	},
	didChangeEditValue: function(ev: React.SyntheticEvent) {
		this.setState({
			editValue: (ev.target as HTMLInputElement).value.toUpperCase()
		});
	},
	didSubmitEditForm: function(ev: React.SyntheticEvent) {
		ev.preventDefault();
		const props = this.props as CandidateListItemProps;
		const state = this.state as CandidateListItemState;
		const fixedLength = store.getFixedCandidateLength();
		
		if (fixedLength === null || state.editValue.length === fixedLength) {
			store.updateCandidateValue(props.candidate.id, state.editValue);
			this.setState({
				editMode: false,
				needsFocus: false,
				editValue: null
			});
		} else {
			this.refs.editCandidateValue.focus();
		}
	},
	didClickCancelEdit: function() {
		this.setState({
			editMode: false,
			needsFocus: false,
			editValue: null
		});
	},
	didClickEdit: function() {
		const props = this.props as CandidateListItemProps;
		
		this.setState({
			editMode: true,
			needsFocus: true,
			editValue: props.candidate.value
		});
	},
	didClickReset: function() {
		const props = this.props as CandidateListItemProps;
		store.updateCandidateMatches(props.candidate.id, null);
	},
	didClickRemove: function() {
		const props = this.props as CandidateListItemProps;
		store.removeCandidate(props.candidate.id);
	},
	render: function() {
		const props = this.props as CandidateListItemProps;
		const state = this.state as CandidateListItemState;
		
		if (state.editMode) {
			return (
				<li>
					<form className="edit-candidate" onSubmit={this.didSubmitEditForm}>
						<input type="text" value={state.editValue} className="edit-candidate-value" onChange={this.didChangeEditValue}
							ref="editCandidateValue" />
						<button type="submit">Update</button>
						<button type="button" onClick={this.didClickCancelEdit}>Cancel</button>
					</form>
				</li>
			);
		}
		
		const valid = props.candidate.isValid(store.getCandidates());
		const className = valid ? (props.onlyValid ? 'match-value-only-valid' : 'match-value-valid') : 'match-value-invalid';
		
		let radioButtons: JSX.Element[] = new Array(props.candidate.value.length);
		for (let i = 0; i <= props.candidate.value.length; i++) {
			radioButtons[i] = (
				<label key={i}>
					<input type="radio" name="matches" value={i.toString()}
						checked={props.candidate.matches === i} onChange={this.didChangeRadioButton} />
					<span>{i}</span>
				</label>
			);
		}
		
		return (
			<li className={className}>
				<span>{props.candidate.value}</span>
				<form className="matches">
					{radioButtons}
					<button type="button" onClick={this.didClickEdit}>Edit</button>
					<button type="button" onClick={this.didClickReset} disabled={props.candidate.matches === null}>Reset</button>
					<button type="button" onClick={this.didClickRemove}>Remove</button>
				</form>
			</li>
		);
	}
});

document.addEventListener('DOMContentLoaded', function () {
	ReactDOM.render(<App />, document.getElementById('app'));
});