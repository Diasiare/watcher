export interface Episode {
	identifier : string,
	number : number,
	url : string,
	base_url : string,
	data? : {
		title? : string,
		text? :string[],
		alt_text? : string,
	}
}