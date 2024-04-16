
#include <bits/stdc++.h> 
using namespace std; 
 
template <class T> T gcd (T a, T b) {  while (b) { T r = a % b; a = b; b = r; } return a; } 
template <class T> T lcm (T a, T b) { return a / gcd (a, b) * b; } 
 
long long sum=0; 
long long  num; 
 
 void processor(vector<long long> & v){ 
 	int N=v.size(); 
 
 	for(int i=1;i<(1<<N);i++){ 
 		LL ct=1; 
 		for(int k=0;k<N;k++)if( i & (1<<k) ) ct=lcm(ct,v[k]);// take the lcm ,as you do not want to double count 
		if(1 & __builtin_popcount(i))sum+=num/ct; // if the number of elements selected are odd add 
		else sum-=num/ct; // if the number of elements are even subtract	                                       
	} 
} 
 
int main(){ 
	vector<long long> v={2,3,6,7,8}; 
	num=20; 
	processor(v); 
	cout<<sum;  // this gives (14) the total number of digits between 1-20 //(inclusive) that are  divisible by the given array of numbers in v .  
	return 0; 
} 